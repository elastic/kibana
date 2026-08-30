/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { InternalIStorageClient, StorageIndexAdapter } from '@kbn/storage-adapter';
import { OccWriter, isElasticsearchWriteConflict } from '@kbn/occ';
import type { OccDocument } from '@kbn/occ';
import type { Logger } from '@kbn/logging';
import { buildSpaceFilter, getExperimentRecordId } from '@kbn/evals-common';
import { ExperimentRecordAlreadyExistsError } from './experiment_record_already_exists_error';
import { ExperimentRecordNotFoundError } from './experiment_record_not_found_error';
import type {
  ExperimentCompleteness,
  ExperimentProtocolSnapshot,
  ExperimentProvenance,
  ExperimentRecordStatus,
  ExperimentRecordStorageProperties,
  experimentsStorageSettings,
} from './experiments_storage';

type ExperimentRecordStorageDocument = ExperimentRecordStorageProperties & { _id?: string };

export type ExperimentsStorageAdapter = StorageIndexAdapter<
  typeof experimentsStorageSettings,
  ExperimentRecordStorageDocument
>;

export interface ExperimentRecordDocument extends ExperimentRecordStorageProperties {
  id: string;
}

export interface CreateExperimentRecordInput {
  experimentId: string;
  name: string;
  description?: string;
  protocol: ExperimentProtocolSnapshot;
  status?: Extract<ExperimentRecordStatus, 'pending' | 'running'>;
  provenance?: ExperimentProvenance;
  startedAt?: string;
  spaceIds?: string[];
}

/** Fields a status transition may change. */
export interface UpdateExperimentRecordInput {
  status?: ExperimentRecordStatus;
  completeness?: ExperimentCompleteness;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

const isTerminal = (status: ExperimentRecordStatus): boolean =>
  status === 'completed' || status === 'failed';

export class ExperimentRecordClient {
  private readonly storage: InternalIStorageClient<ExperimentRecordStorageDocument>;
  private readonly writer: OccWriter<ExperimentRecordStorageProperties>;
  private readonly spaceId: string;
  private readonly spaceFilter: QueryDslQueryContainer;

  constructor({
    storageAdapter,
    logger,
    spaceId,
  }: {
    storageAdapter: ExperimentsStorageAdapter;
    logger: Logger;
    spaceId: string;
  }) {
    this.storage = storageAdapter.getClient();
    this.spaceId = spaceId;
    this.spaceFilter = buildSpaceFilter(spaceId);

    this.writer = new OccWriter<ExperimentRecordStorageProperties>({
      get: async (id) => (await this.getForWrite(id)) ?? null,
      index: async ({ id, document, ifSeqNo, ifPrimaryTerm }) => {
        const response = await this.storage.index({
          id,
          document,
          refresh: true,
          ...(ifSeqNo != null && ifPrimaryTerm != null
            ? { if_seq_no: ifSeqNo, if_primary_term: ifPrimaryTerm }
            : {}),
        });

        if (response._seq_no == null || response._primary_term == null) {
          throw new Error(`Indexing experiment record "${id}" returned no _seq_no/_primary_term`);
        }

        return { seqNo: response._seq_no, primaryTerm: response._primary_term };
      },
      logger,
    });
  }

  private scoped(query: QueryDslQueryContainer): QueryDslQueryContainer {
    return { bool: { must: [query], filter: [this.spaceFilter] } };
  }

  async create({
    experimentId,
    name,
    description,
    protocol,
    status = 'running',
    provenance,
    startedAt,
    spaceIds,
  }: CreateExperimentRecordInput): Promise<ExperimentRecordDocument> {
    const timestamp = new Date().toISOString();
    const resolvedStartedAt = startedAt ?? (status === 'running' ? timestamp : undefined);
    const document: ExperimentRecordStorageProperties = {
      experiment_id: experimentId,
      name,
      ...(description !== undefined ? { description } : {}),
      protocol,
      status,
      ...(resolvedStartedAt ? { started_at: resolvedStartedAt } : {}),
      ...(provenance ? { provenance } : {}),
      space_ids: Array.from(new Set([this.spaceId, ...(spaceIds ?? [])])),
      created_at: timestamp,
      updated_at: timestamp,
    };

    const id = getExperimentRecordId(this.spaceId, experimentId);

    try {
      await this.storage.index({ id, op_type: 'create', document, refresh: true });
    } catch (error) {
      // Another create of the same experiment reached the same derived id first.
      if (isElasticsearchWriteConflict(error)) {
        throw new ExperimentRecordAlreadyExistsError(experimentId);
      }
      throw error;
    }

    return toRecord(id, document);
  }

  async get(experimentId: string): Promise<ExperimentRecordDocument | undefined> {
    const response = await this.storage.search({
      track_total_hits: false,
      size: 1,
      query: this.scoped({ term: { experiment_id: experimentId } }),
    });

    const [hit] = response.hits.hits;
    return hit?._source && hit._id ? toRecord(hit._id, hit._source) : undefined;
  }

  /**
   * Applies a status transition in place. Timestamps follow the status: leaving
   * `pending` stamps `started_at`, reaching `completed` or `failed` stamps
   * `completed_at`, unless the caller supplies its own.
   */
  async update(
    experimentId: string,
    patch: UpdateExperimentRecordInput
  ): Promise<ExperimentRecordDocument> {
    const id = getExperimentRecordId(this.spaceId, experimentId);

    if (!(await this.getForWrite(id))) {
      throw new ExperimentRecordNotFoundError(experimentId);
    }

    try {
      const { document } = await this.writer.readModifyWrite({
        id,
        mutate: (current) => applyUpdate(current, patch),
      });
      return toRecord(id, document);
    } catch (error) {
      // A delete landing between the check above and the write makes the
      // writer throw its own untyped not-found error; re-read rather than
      // matching its message.
      let exists: boolean;
      try {
        exists = !!(await this.getForWrite(id));
      } catch {
        throw error;
      }
      if (!exists) {
        throw new ExperimentRecordNotFoundError(experimentId);
      }
      throw error;
    }
  }

  /**
   * Reads a record along with the `_seq_no`/`_primary_term` a conditional write
   * has to send back. Scoped to the space so another space's record behind the
   * same id can be neither read nor overwritten.
   */
  private async getForWrite(
    id: string
  ): Promise<OccDocument<ExperimentRecordStorageProperties> | undefined> {
    const response = await this.storage.search({
      track_total_hits: false,
      size: 1,
      seq_no_primary_term: true,
      query: this.scoped({ term: { _id: id } }),
    });

    const [hit] = response.hits.hits;
    if (!hit?._source || hit._seq_no == null || hit._primary_term == null) {
      return undefined;
    }

    return {
      id,
      source: hit._source,
      occ: { seqNo: hit._seq_no, primaryTerm: hit._primary_term },
    };
  }
}

const applyUpdate = (
  current: ExperimentRecordStorageProperties,
  patch: UpdateExperimentRecordInput
): ExperimentRecordStorageProperties => {
  const status = patch.status ?? current.status;
  const timestamp = new Date().toISOString();

  const startedAt =
    patch.startedAt ??
    current.started_at ??
    (current.status === 'pending' && status === 'running' ? timestamp : undefined);
  const completedAt = isTerminal(status)
    ? patch.completedAt ?? current.completed_at ?? timestamp
    : current.completed_at;

  return {
    ...current,
    status,
    ...(startedAt ? { started_at: startedAt } : {}),
    ...(completedAt ? { completed_at: completedAt } : {}),
    ...(patch.completeness !== undefined ? { completeness: patch.completeness } : {}),
    ...(patch.error !== undefined ? { error: patch.error } : {}),
    updated_at: timestamp,
  };
};

const toRecord = (
  id: string,
  source: ExperimentRecordStorageProperties
): ExperimentRecordDocument => ({
  id,
  experiment_id: source.experiment_id,
  name: source.name,
  ...(source.description !== undefined ? { description: source.description } : {}),
  protocol: source.protocol,
  status: source.status,
  ...(source.started_at ? { started_at: source.started_at } : {}),
  ...(source.completed_at ? { completed_at: source.completed_at } : {}),
  ...(source.provenance ? { provenance: source.provenance } : {}),
  ...(source.completeness ? { completeness: source.completeness } : {}),
  ...(source.error !== undefined ? { error: source.error } : {}),
  space_ids: source.space_ids ?? [],
  created_at: source.created_at,
  updated_at: source.updated_at,
});
