/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam.
 *
 * The minimal "claim store": the slice of TaskStore the coordinator actually
 * needs, rebuilt on top of { esClient, serializer } only.
 *
 * Carved out of TaskStore (what was CUT, and why it had to be):
 *  - savedObjectsRepository / savedObjectsService  -> only used by CRUD,
 *    bulkGet hydration, and API-key invalidation. None of those are part of
 *    claiming; hydration moved to the executor side of the seam.
 *  - EncryptedSavedObjects client                  -> API-key decryption is
 *    execution-side by definition (the coordinator must never see secrets).
 *  - ExecutionContextStart (executionContextRunner)-> CoreStart contract used
 *    purely for APM labels; dropped in the fork.
 *  - security / apiKeyStrategy                     -> execution-side.
 *  - TaskValidator                                 -> validates params/state,
 *    which the claim path never reads (slim candidates).
 */

import { Subject } from 'rxjs';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectsSerializer, SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import { decodeRequestVersion, encodeVersion } from '@kbn/core-saved-objects-base-server-internal';

import type {
  ConcreteTaskInstanceVersion,
  PartialConcreteTaskInstance,
  PartialSerializedConcreteTaskInstance,
  SerializedConcreteTaskInstance,
  TaskClaimCandidate,
} from '../task';
import type { SearchOpts } from '../task_store';
import type { Result } from '../lib/result_type';
import { asOk, asErr } from '../lib/result_type';
import { claimSort } from '../queries/mark_available_tasks_as_claimed';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { CoordinatorDefinitionsRegistry } from './definitions_registry';
import type { CoordinatorLogger } from './types';

// Same exclusions as TaskStore's claim-candidate msearch: the claim phase
// never needs params/state/API keys.
const CLAIM_CANDIDATE_SOURCE_EXCLUDES = [
  'task.state',
  'task.params',
  'task.apiKey',
  'task.uiamApiKey',
];

export interface CoordinatorStoreOpts {
  esClient: ElasticsearchClient;
  serializer: ISavedObjectsSerializer;
  index: string;
  taskManagerId: string;
  definitions: CoordinatorDefinitionsRegistry;
  logger: CoordinatorLogger;
}

export interface ClaimCandidateFetchResult {
  docs: TaskClaimCandidate[];
  versionMap: Map<string, ConcreteTaskInstanceVersion>;
}

export interface PartialUpdateErr {
  type: string;
  id: string;
  status?: number;
  error?: unknown;
}

export type CoordinatorPartialUpdateResult = Result<PartialConcreteTaskInstance, PartialUpdateErr>;

export class CoordinatorStore {
  public readonly index: string;
  public readonly taskManagerId: string;
  public readonly errors$ = new Subject<Error>();

  private readonly esClient: ElasticsearchClient;
  private readonly serializer: ISavedObjectsSerializer;
  private readonly definitions: CoordinatorDefinitionsRegistry;
  private readonly logger: CoordinatorLogger;

  constructor(opts: CoordinatorStoreOpts) {
    this.esClient = opts.esClient;
    this.serializer = opts.serializer;
    this.index = opts.index;
    this.taskManagerId = opts.taskManagerId;
    this.definitions = opts.definitions;
    this.logger = opts.logger;
  }

  /** Mirrors TaskStore._msearch for claim candidates. */
  public async msearch(opts: SearchOpts[] = []): Promise<ClaimCandidateFetchResult> {
    const queries = opts.map(({ sort = [{ 'task.runAt': 'asc' }], ...opt }) => ({
      ...ensureQueryOnlyReturnsTaskObjects({ sort, ...opt }),
      _source: { excludes: CLAIM_CANDIDATE_SOURCE_EXCLUDES },
    }));
    const searches = queries.flatMap((query) => [{}, query]);

    let result;
    try {
      result = await this.esClient.msearch<SavedObjectsRawDoc['_source']>(
        { index: this.index, ignore_unavailable: true, searches },
        { retryOnTimeout: false }
      );
    } catch (e) {
      this.errors$.next(e);
      throw e;
    }

    const versionMap = new Map<string, ConcreteTaskInstanceVersion>();
    let allTasks = new Array<TaskClaimCandidate>();

    for (const response of result.responses) {
      if (response.status !== 200) {
        const err = new Error(`msearch failed with status ${response.status}`);
        this.errors$.next(err);
        throw err;
      }
      const { hits } = response as estypes.MsearchMultiSearchItem<SavedObjectsRawDoc['_source']>;
      this.addTasksToVersionMap(versionMap, hits.hits);
      allTasks = allTasks.concat(this.hitsToClaimCandidates(hits.hits));
    }

    return {
      // claimSort only reads public dictionary methods; the registry implements them.
      docs: claimSort(this.definitions as unknown as TaskTypeDictionary, allTasks),
      versionMap,
    };
  }

  /** Mirrors TaskStore.getDocVersions (mget, no _source). */
  public async getDocVersions(esIds: string[]): Promise<Map<string, ConcreteTaskInstanceVersion>> {
    let taskVersions: estypes.MgetResponse<never>;
    try {
      taskVersions = await this.esClient.mget<never>(
        { index: this.index, _source: false, ids: esIds },
        { retryOnTimeout: false }
      );
    } catch (e) {
      this.errors$.next(e);
      throw e;
    }

    const result = new Map<string, ConcreteTaskInstanceVersion>();
    for (const doc of taskVersions.docs) {
      const asGet = doc as estypes.GetGetResult;
      if (asGet.found !== undefined) {
        if (!asGet.found) {
          result.set(asGet._id!, { esId: asGet._id!, error: `task "${asGet._id}" not found` });
        } else {
          result.set(asGet._id!, {
            esId: asGet._id!,
            seqNo: asGet._seq_no,
            primaryTerm: asGet._primary_term,
          });
        }
      } else {
        const failure = doc as estypes.MgetMultiGetError;
        result.set(failure._id!, {
          esId: failure._id!,
          error: `error getting version for ${failure._id}`,
        });
      }
    }
    return result;
  }

  /** Mirrors TaskStore._bulkPartialUpdate for the claim-stamp update only. */
  public async bulkPartialUpdate(
    docs: PartialConcreteTaskInstance[]
  ): Promise<CoordinatorPartialUpdateResult[]> {
    if (docs.length === 0) return [];

    const bulkBody = [];
    for (const doc of docs) {
      bulkBody.push({
        update: {
          _id: `task:${doc.id}`,
          ...(doc.version ? decodeRequestVersion(doc.version) : {}),
        },
      });
      bulkBody.push({ doc: { task: partialClaimUpdateToAttributes(doc) } });
    }

    let result: estypes.BulkResponse;
    try {
      result = await this.esClient.bulk({ index: this.index, refresh: false, body: bulkBody });
    } catch (e) {
      this.errors$.next(e);
      throw e;
    }

    return result.items.map((item, index) => {
      if (!item.update || !item.update._id) {
        const err = new Error('malformed bulk update response');
        this.errors$.next(err);
        return asErr({ type: 'task', id: 'unknown', error: { type: 'malformed response' } });
      }
      const docId = item.update._id.startsWith('task:')
        ? item.update._id.slice(5)
        : item.update._id;

      if (item.update?.error) {
        if (item.update.status !== 409) {
          this.errors$.next(
            new Error(`bulk update failed: ${item.update.error.type}: ${item.update.error.reason}`)
          );
        }
        return asErr({
          type: 'task',
          id: docId,
          status: item.update.status,
          error: item.update.error,
        });
      }

      return asOk({
        ...docs[index],
        id: docId,
        version: encodeVersion(item.update._seq_no, item.update._primary_term),
      });
    });
  }

  private addTasksToVersionMap(
    versionMap: Map<string, ConcreteTaskInstanceVersion>,
    hits: Array<estypes.SearchHit<SavedObjectsRawDoc['_source']>>
  ): void {
    for (const task of hits) {
      if (task._id == null || task._seq_no == null || task._primary_term == null) continue;
      const esId = task._id.startsWith('task:') ? task._id.slice(5) : task._id;
      versionMap.set(esId, {
        esId: task._id,
        seqNo: task._seq_no,
        primaryTerm: task._primary_term,
      });
    }
  }

  private hitsToClaimCandidates(
    hits: Array<estypes.SearchHit<SavedObjectsRawDoc['_source']>>
  ): TaskClaimCandidate[] {
    const candidates: TaskClaimCandidate[] = [];
    for (const hit of hits) {
      // isRawSavedObject needs the 'task' type registered on the serializer's registry.
      if (!this.serializer.isRawSavedObject(hit as SavedObjectsRawDoc)) {
        this.logger.warn(`Coordinator msearch returned a non-task document: ${hit._id}`);
        continue;
      }
      const savedObject = this.serializer.rawToSavedObject(hit as SavedObjectsRawDoc);
      candidates.push(
        savedObjectToClaimCandidate(
          savedObject.id,
          savedObject.version,
          savedObject.attributes as SerializedConcreteTaskInstance
        )
      );
    }
    return candidates;
  }
}

/**
 * Local fork of task_store's savedObjectToTaskClaimCandidate without the
 * userScope space-branding (claiming never reads userScope).
 */
function savedObjectToClaimCandidate(
  id: string,
  version: string | undefined,
  attributes: SerializedConcreteTaskInstance
): TaskClaimCandidate {
  const { state, params, apiKey, uiamApiKey, userScope, ...rest } = attributes;
  return {
    ...rest,
    id,
    version,
    scheduledAt: new Date(attributes.scheduledAt),
    runAt: new Date(attributes.runAt),
    startedAt: attributes.startedAt ? new Date(attributes.startedAt) : null,
    retryAt: attributes.retryAt ? new Date(attributes.retryAt) : null,
  } as TaskClaimCandidate;
}

/**
 * Local fork of task_store's partialTaskInstanceToAttributes, specialised to
 * the claim-stamp update (scheduledAt/status/startedAt/attempts/retryAt/ownerId).
 */
function partialClaimUpdateToAttributes(
  doc: PartialConcreteTaskInstance
): PartialSerializedConcreteTaskInstance {
  const { id, version, ...rest } = doc;
  return {
    ...rest,
    ...(doc.scheduledAt ? { scheduledAt: doc.scheduledAt.toISOString() } : {}),
    ...(doc.startedAt ? { startedAt: doc.startedAt.toISOString() } : {}),
    ...(doc.retryAt ? { retryAt: doc.retryAt.toISOString() } : {}),
    ...(doc.runAt ? { runAt: doc.runAt.toISOString() } : {}),
  } as PartialSerializedConcreteTaskInstance;
}

function ensureQueryOnlyReturnsTaskObjects(opts: SearchOpts): SearchOpts {
  const originalQuery = opts.query;
  const queryOnlyTasks = { term: { type: 'task' } };
  const query = originalQuery
    ? { bool: { must: [queryOnlyTasks, originalQuery] } }
    : queryOnlyTasks;
  return { ...opts, query };
}
