/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { StorageTransportOptions } from '@kbn/storage-adapter';
import type { Observable } from '../../../common/types/domain';
import { generateObservableDocumentId } from './observable_id';
import type {
  ObservableDocument,
  ObservableSource,
  ObservablesStorageClient,
} from './observables_index';

export { createObservablesStorage } from './observables_index';
export type {
  ObservableDocument,
  ObservableSource,
  ObservablesStorage,
  ObservablesStorageClient,
} from './observables_index';
export { generateObservableDocumentId } from './observable_id';

interface CaseScope {
  caseId: string;
  spaceId: string;
}

interface CreateObservablesArgs extends CaseScope {
  owner: string;
  observables: Observable[];
  source: ObservableSource;
}

interface DeleteObservablesArgs extends CaseScope {
  observables: Observable[];
}

interface UpdateObservableArgs extends CaseScope {
  owner: string;
  previous: Observable;
  next: Observable;
  source: ObservableSource;
}

interface SyncCaseArgs extends CaseScope {
  owner: string;
  observables: Observable[];
  source: ObservableSource;
  signal?: AbortSignal;
}

interface DeleteCaseDocumentsArgs extends CaseScope {
  signal?: AbortSignal;
}

interface ListCaseIdsArgs {
  size: number;
  after?: ObservablesCaseKey;
  signal?: AbortSignal;
}

export interface SyncCaseResult {
  created: number;
  updated: number;
  deleted: number;
}

/** A case as it appears in the observables index: a case id is only unique within its space. */
export interface ObservablesCaseKey {
  caseId: string;
  spaceId: string;
}

const CONFLICT = 409;
const NOT_FOUND = 404;

/** Documents fetched, or ids deleted, per request while syncing a case. */
const SYNC_PAGE_SIZE = 1000;
/** Bounds the delete loop of a case, so an unexpected index state cannot spin a sync forever. */
const MAX_DELETE_ROUNDS = 100;

const getStatusCode = (error: unknown): number | undefined =>
  (error as { meta?: { statusCode?: number }; statusCode?: number })?.meta?.statusCode ??
  (error as { statusCode?: number })?.statusCode;

/**
 * Mirrors the observables of a case into the observables index, one document per observable.
 *
 * While the case field is the source of truth, every method is a best-effort mirror that throws when
 * the index could not be fully written, so the caller can record the case as out of sync. An existing
 * document on create (409) and a missing document on delete (404) are not failures: the same observable
 * has the same deterministic id, so both mean the index already holds the intended state.
 */
export class ObservablesService {
  private readonly logger: Logger;
  private readonly storageClient: ObservablesStorageClient;

  constructor({
    storageClient,
    logger,
  }: {
    storageClient: ObservablesStorageClient;
    logger: Logger;
  }) {
    this.storageClient = storageClient;
    this.logger = logger;
  }

  public async createObservables({
    caseId,
    spaceId,
    owner,
    observables,
    source,
  }: CreateObservablesArgs): Promise<void> {
    if (observables.length === 0) {
      return;
    }

    await this.bulk({
      caseId,
      toleratedStatus: CONFLICT,
      operations: observables.map((observable) => ({
        create: {
          _id: generateObservableDocumentId({ spaceId, caseId, ...observable }),
          document: toDocument({ caseId, spaceId, owner, observable, source }),
        },
      })),
    });
  }

  public async deleteObservables({
    caseId,
    spaceId,
    observables,
  }: DeleteObservablesArgs): Promise<void> {
    if (observables.length === 0) {
      return;
    }

    await this.bulk({
      caseId,
      toleratedStatus: NOT_FOUND,
      operations: observables.map((observable) => ({
        delete: { _id: generateObservableDocumentId({ spaceId, caseId, ...observable }) },
      })),
    });
  }

  /**
   * A value change gets a new document id, so the new document is created and the old one deleted.
   * A description-only change rewrites the same document and keeps the source it was added with.
   */
  public async updateObservable({
    caseId,
    spaceId,
    owner,
    previous,
    next,
    source,
  }: UpdateObservableArgs): Promise<void> {
    const previousId = generateObservableDocumentId({ spaceId, caseId, ...previous });
    const nextId = generateObservableDocumentId({ spaceId, caseId, ...next });

    if (previousId !== nextId) {
      await this.bulk({
        caseId,
        toleratedStatus: CONFLICT,
        operations: [
          {
            create: {
              _id: nextId,
              document: toDocument({ caseId, spaceId, owner, observable: next, source }),
            },
          },
        ],
      });
      await this.deleteObservables({ caseId, spaceId, observables: [previous] });
      return;
    }

    const existingSource = await this.getSource(previousId);

    await this.bulk({
      caseId,
      operations: [
        {
          index: {
            _id: nextId,
            document: toDocument({
              caseId,
              spaceId,
              owner,
              observable: next,
              source: existingSource ?? source,
            }),
          },
        },
      ],
    });
  }

  /**
   * Makes the index hold exactly the given observables for a case: missing documents are created,
   * documents that differ from the observable are rewritten (keeping the source they were added with),
   * and documents of the case that are not among the observables are deleted. Safe to repeat and to
   * interrupt, because every write is keyed by the deterministic document id.
   */
  public async syncCase({
    caseId,
    spaceId,
    owner,
    observables,
    source,
    signal,
  }: SyncCaseArgs): Promise<SyncCaseResult> {
    const expected = new Map<string, Observable>();
    observables.forEach((observable) => {
      const id = generateObservableDocumentId({ spaceId, caseId, ...observable });
      if (!expected.has(id)) {
        expected.set(id, observable);
      }
    });
    const expectedIds = [...expected.keys()];

    const deleted = await this.deleteDocumentsOutside({
      caseId,
      spaceId,
      keepIds: expectedIds,
      signal,
    });
    const existing = await this.getDocuments({ caseId, spaceId, ids: expectedIds, signal });

    let created = 0;
    let updated = 0;
    const operations: Parameters<ObservablesStorageClient['bulk']>[0]['operations'] = [];
    expected.forEach((observable, id) => {
      const current = existing.get(id);
      if (!current) {
        created++;
        operations.push({
          create: { _id: id, document: toDocument({ caseId, spaceId, owner, observable, source }) },
        });
        return;
      }
      if (!isDocumentInSync({ document: current, observable, owner })) {
        updated++;
        operations.push({
          index: {
            _id: id,
            document: toDocument({ caseId, spaceId, owner, observable, source: current.source }),
          },
        });
      }
    });

    if (operations.length > 0) {
      await this.bulk({ caseId, operations, toleratedStatus: CONFLICT, signal });
    }

    return { created, updated, deleted };
  }

  /** Deletes every document of a case, returning how many were found. */
  public async deleteCaseDocuments({
    caseId,
    spaceId,
    signal,
  }: DeleteCaseDocumentsArgs): Promise<number> {
    return this.deleteDocumentsOutside({ caseId, spaceId, keepIds: [], signal });
  }

  /** Pages through the distinct cases that have documents in the index, in a stable order. */
  public async listCaseKeys({
    size,
    after,
    signal,
  }: ListCaseIdsArgs): Promise<{ cases: ObservablesCaseKey[]; after?: ObservablesCaseKey }> {
    const response = await this.storageClient.search(
      {
        size: 0,
        track_total_hits: false,
        aggs: {
          cases: {
            composite: {
              size,
              sources: [
                { case_id: { terms: { field: 'case_id' } } },
                { space_id: { terms: { field: 'space_id' } } },
              ],
              ...(after ? { after: { case_id: after.caseId, space_id: after.spaceId } } : {}),
            },
          },
        },
      },
      ...toTransportArgs(signal)
    );

    const buckets = response.aggregations?.cases.buckets ?? [];
    const afterKey = response.aggregations?.cases.after_key;
    return {
      cases: buckets.map(({ key }) => ({
        caseId: String(key.case_id),
        spaceId: String(key.space_id),
      })),
      after:
        buckets.length > 0 && afterKey
          ? { caseId: String(afterKey.case_id), spaceId: String(afterKey.space_id) }
          : undefined,
    };
  }

  private async deleteDocumentsOutside({
    caseId,
    spaceId,
    keepIds,
    signal,
  }: CaseScope & { keepIds: string[]; signal?: AbortSignal }): Promise<number> {
    let deleted = 0;
    for (let round = 0; round < MAX_DELETE_ROUNDS; round++) {
      const response = await this.storageClient.search(
        {
          size: SYNC_PAGE_SIZE,
          track_total_hits: false,
          // The storage adapter rejects hits without a source object, so a field is requested instead
          // of excluding the source.
          _source: ['case_id'],
          query: {
            bool: {
              filter: [{ term: { case_id: caseId } }, { term: { space_id: spaceId } }],
              ...(keepIds.length > 0 ? { must_not: [{ ids: { values: keepIds } }] } : {}),
            },
          },
        },
        ...toTransportArgs(signal)
      );
      const ids = response.hits.hits.flatMap(({ _id }) => (_id ? [_id] : []));
      if (ids.length === 0) {
        return deleted;
      }

      await this.bulk({
        caseId,
        toleratedStatus: NOT_FOUND,
        operations: ids.map((id) => ({ delete: { _id: id } })),
        signal,
      });
      deleted += ids.length;
    }

    throw new Error(
      `Could not remove all extra observables of case ${caseId} from the observables index after ${MAX_DELETE_ROUNDS} rounds`
    );
  }

  private async getDocuments({
    caseId,
    spaceId,
    ids,
    signal,
  }: CaseScope & { ids: string[]; signal?: AbortSignal }): Promise<
    Map<string, ObservableDocument>
  > {
    const documents = new Map<string, ObservableDocument>();

    for (let from = 0; from < ids.length; from += SYNC_PAGE_SIZE) {
      const chunk = ids.slice(from, from + SYNC_PAGE_SIZE);
      const response = await this.storageClient.search(
        {
          size: chunk.length,
          track_total_hits: false,
          query: {
            bool: {
              filter: [
                { ids: { values: chunk } },
                { term: { case_id: caseId } },
                { term: { space_id: spaceId } },
              ],
            },
          },
        },
        ...toTransportArgs(signal)
      );
      response.hits.hits.forEach(({ _id, _source }) => {
        if (_id && _source) {
          documents.set(_id, _source);
        }
      });
    }

    return documents;
  }

  private async getSource(id: string): Promise<ObservableSource | undefined> {
    try {
      const response = await this.storageClient.get({ id });
      return response._source?.source;
    } catch (error) {
      if (getStatusCode(error) === NOT_FOUND) {
        return undefined;
      }
      throw error;
    }
  }

  private async bulk({
    caseId,
    operations,
    toleratedStatus,
    signal,
  }: {
    caseId: string;
    operations: Parameters<ObservablesStorageClient['bulk']>[0]['operations'];
    toleratedStatus?: number;
    signal?: AbortSignal;
  }): Promise<void> {
    const response = await this.storageClient.bulk({ operations }, ...toTransportArgs(signal));

    if (!response.errors) {
      return;
    }

    const failures = response.items
      .map((item) => Object.values(item)[0])
      .filter(
        (result) =>
          result?.error !== undefined &&
          (toleratedStatus === undefined || result.status !== toleratedStatus)
      );

    if (failures.length === 0) {
      return;
    }

    this.logger.warn(
      `Failed to write ${failures.length} of ${operations.length} observables of case ${caseId} to the observables index`
    );
    throw new Error(
      `Failed to write ${failures.length} observables to the observables index: ${
        failures[0]?.error?.reason ?? 'unknown reason'
      }`
    );
  }
}

const toTransportArgs = (signal?: AbortSignal): [StorageTransportOptions] | [] =>
  signal ? [{ signal }] : [];

const isDocumentInSync = ({
  document,
  observable,
  owner,
}: {
  document: ObservableDocument;
  observable: Observable;
  owner: string;
}): boolean =>
  document.owner === owner &&
  document.type_key === observable.typeKey &&
  document.value === observable.value &&
  (document.description ?? '') === (observable.description ?? '') &&
  document.legacy_id === observable.id &&
  document.created_at === observable.createdAt &&
  document.updated_at === (observable.updatedAt ?? observable.createdAt);

const toDocument = ({
  caseId,
  spaceId,
  owner,
  observable,
  source,
}: {
  caseId: string;
  spaceId: string;
  owner: string;
  observable: Observable;
  source: ObservableSource;
}): ObservableDocument => ({
  case_id: caseId,
  space_id: spaceId,
  owner,
  type_key: observable.typeKey,
  value: observable.value,
  ...(observable.description ? { description: observable.description } : {}),
  legacy_id: observable.id,
  source,
  created_at: observable.createdAt,
  updated_at: observable.updatedAt ?? observable.createdAt,
});
