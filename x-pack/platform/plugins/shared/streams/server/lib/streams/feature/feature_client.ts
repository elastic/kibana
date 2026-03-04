/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateRangeQuery, termQuery, termsQuery } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IStorageClient } from '@kbn/storage-adapter';
import type { BaseFeature, Feature } from '@kbn/streams-schema';
import { isDuplicateFeature } from '@kbn/streams-schema';
import { isNotFoundError } from '@kbn/es-errors';
import {
  STREAM_NAME,
  FEATURE_ID,
  FEATURE_UUID,
  FEATURE_LAST_SEEN,
  FEATURE_STATUS,
  FEATURE_EVIDENCE,
  FEATURE_CONFIDENCE,
  FEATURE_DESCRIPTION,
  FEATURE_TYPE,
  FEATURE_SUBTYPE,
  FEATURE_TITLE,
  FEATURE_PROPERTIES,
  FEATURE_TAGS,
  FEATURE_META,
  FEATURE_EXPIRES_AT,
  FEATURE_DELETED_AT,
  FEATURE_EVIDENCE_DOC_IDS,
} from './fields';
import type { FeatureStorageSettings } from './storage_settings';
import type { StoredFeature } from './stored_feature';
import { StatusError } from '../errors/status_error';

interface FeatureBulkIndexOperation {
  index: { feature: Feature };
}
interface FeatureBulkDeleteOperation {
  delete: { id: string };
}

export type FeatureBulkOperation = FeatureBulkIndexOperation | FeatureBulkDeleteOperation;

export const MAX_FEATURE_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export class FeatureClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<FeatureStorageSettings, StoredFeature>;
    }
  ) {}

  async clean() {
    await this.clients.storageClient.clean();
  }

  async bulk(stream: string, operations: FeatureBulkOperation[]) {
    const { indexOps, deleteFeatures } = await this.resolveValidBulkOperations(stream, operations);

    const now = new Date().toISOString();
    const softDeleteIndexOps = deleteFeatures.map((feature) => {
      const document = toStorage(stream, { ...feature, deleted_at: now, expires_at: undefined });
      return { index: { document, _id: document[FEATURE_UUID] } };
    });

    const regularIndexOps = indexOps.map((op) => {
      const document = toStorage(stream, op.index.feature);
      return { index: { document, _id: document[FEATURE_UUID] } };
    });

    return this.clients.storageClient.bulk({
      operations: [...regularIndexOps, ...softDeleteIndexOps],
      throwOnFail: true,
    });
  }

  async getFeatures(
    streams: string | string[],
    filters?: {
      type?: string[];
      id?: string[];
      minConfidence?: number;
      limit?: number;
      includeDeleted?: boolean;
    }
  ): Promise<{ hits: Feature[]; total: number }> {
    const streamNames = Array.isArray(streams) ? streams : [streams];
    if (streamNames.length === 0) {
      return { hits: [], total: 0 };
    }

    const filterClauses: QueryDslQueryContainer[] = [
      ...termsQuery(STREAM_NAME, streamNames),
      ...(filters?.id?.length ? termsQuery(FEATURE_ID, filters.id) : []),
      {
        bool: {
          should: [
            { bool: { must_not: { exists: { field: FEATURE_EXPIRES_AT } } } },
            ...dateRangeQuery(Date.now(), undefined, FEATURE_EXPIRES_AT),
          ],
          minimum_should_match: 1,
        },
      },
    ];

    if (!filters?.includeDeleted) {
      filterClauses.push({
        bool: { must_not: { exists: { field: FEATURE_DELETED_AT } } },
      });
    }

    if (filters?.type?.length) {
      filterClauses.push({
        bool: {
          should: filters.type.flatMap((type) => termQuery(FEATURE_TYPE, type)),
          minimum_should_match: 1,
        },
      });
    }

    if (typeof filters?.minConfidence === 'number') {
      filterClauses.push({
        range: {
          [FEATURE_CONFIDENCE]: {
            gte: filters.minConfidence,
          },
        },
      });
    }

    const featuresResponse = await this.clients.storageClient.search({
      size: filters?.limit ?? 10_000,
      track_total_hits: true,
      query: {
        bool: {
          filter: filterClauses,
        },
      },
      sort: [{ [FEATURE_CONFIDENCE]: { order: 'desc' } }],
    });

    return {
      hits: featuresResponse.hits.hits.map((hit) => fromStorage(hit._source)),
      total: featuresResponse.hits.total.value,
    };
  }

  async getFeature(stream: string, uuid: string, options?: { includeDeleted?: boolean }) {
    const hit = await this.clients.storageClient.get({ id: uuid }).catch((err) => {
      if (isNotFoundError(err)) {
        throw new StatusError(`Feature ${uuid} not found`, 404);
      }
      throw err;
    });

    const source = hit._source!;
    if (source[STREAM_NAME] !== stream) {
      throw new StatusError(`Feature ${uuid} not found`, 404);
    }

    if (!options?.includeDeleted && source[FEATURE_DELETED_AT]) {
      throw new StatusError(`Feature ${uuid} not found`, 404);
    }

    return fromStorage(source);
  }

  async getDeletedFeatures(
    stream: string,
    options?: { limit?: number }
  ): Promise<{ hits: Feature[]; total: number }> {
    const featuresResponse = await this.clients.storageClient.search({
      size: options?.limit ?? 10_000,
      track_total_hits: true,
      query: {
        bool: {
          filter: [...termsQuery(STREAM_NAME, [stream]), { exists: { field: FEATURE_DELETED_AT } }],
        },
      },
      sort: [{ [FEATURE_DELETED_AT]: { order: 'desc' } }],
    });

    return {
      hits: featuresResponse.hits.hits.map((hit) => fromStorage(hit._source)),
      total: featuresResponse.hits.total.value,
    };
  }

  async softDeleteFeature(stream: string, uuid: string) {
    const feature = await this.getFeature(stream, uuid);
    const softDeleted: Feature = {
      ...feature,
      deleted_at: new Date().toISOString(),
      expires_at: undefined,
    };
    const document = toStorage(stream, softDeleted);
    return this.clients.storageClient.index({
      id: document[FEATURE_UUID],
      document,
    });
  }

  async hardDeleteFeatures(stream: string) {
    const features = await this.getFeatures(stream, { includeDeleted: true });
    return this.clients.storageClient.bulk({
      operations: features.hits.map((feature) => ({
        delete: { _id: feature.uuid },
      })),
    });
  }

  private async resolveValidBulkOperations(
    stream: string,
    operations: FeatureBulkOperation[]
  ): Promise<{ indexOps: FeatureBulkIndexOperation[]; deleteFeatures: Feature[] }> {
    const indexOps = operations.filter((op): op is FeatureBulkIndexOperation => 'index' in op);
    const deleteIds = operations.flatMap((op) => ('delete' in op ? op.delete.id : []));

    const deleteFeatures: Feature[] =
      deleteIds.length > 0
        ? (
            await this.clients.storageClient.search({
              size: deleteIds.length,
              track_total_hits: false,
              query: {
                bool: {
                  filter: [{ terms: { _id: deleteIds } }, ...termQuery(STREAM_NAME, stream)],
                  must_not: [{ exists: { field: FEATURE_DELETED_AT } }],
                },
              },
            })
          ).hits.hits.map((hit) => fromStorage(hit._source))
        : [];

    return { indexOps, deleteFeatures };
  }

  findDuplicateFeature({
    existingFeatures,
    feature,
  }: {
    existingFeatures: Feature[];
    feature: BaseFeature;
  }): Feature | undefined {
    return existingFeatures.find((existing) => isDuplicateFeature(existing, feature));
  }
}

function toStorage(stream: string, feature: Feature): StoredFeature {
  return {
    [FEATURE_UUID]: feature.uuid,
    [FEATURE_ID]: feature.id,
    [FEATURE_TYPE]: feature.type,
    [FEATURE_SUBTYPE]: feature.subtype,
    [FEATURE_DESCRIPTION]: feature.description,
    [FEATURE_PROPERTIES]: feature.properties,
    [FEATURE_CONFIDENCE]: feature.confidence,
    [FEATURE_EVIDENCE]: feature.evidence,
    [FEATURE_EVIDENCE_DOC_IDS]: feature.evidence_doc_ids,
    [FEATURE_STATUS]: feature.status,
    [FEATURE_LAST_SEEN]: feature.last_seen,
    [FEATURE_TAGS]: feature.tags,
    [STREAM_NAME]: stream,
    [FEATURE_META]: feature.meta,
    [FEATURE_EXPIRES_AT]: feature.expires_at,
    [FEATURE_DELETED_AT]: feature.deleted_at,
    [FEATURE_TITLE]: feature.title,
  };
}

function fromStorage(feature: StoredFeature): Feature {
  return {
    uuid: feature[FEATURE_UUID],
    id: feature[FEATURE_ID],
    stream_name: feature[STREAM_NAME],
    type: feature[FEATURE_TYPE],
    subtype: feature[FEATURE_SUBTYPE],
    description: feature[FEATURE_DESCRIPTION],
    properties: feature[FEATURE_PROPERTIES],
    confidence: feature[FEATURE_CONFIDENCE],
    evidence: feature[FEATURE_EVIDENCE],
    evidence_doc_ids: feature[FEATURE_EVIDENCE_DOC_IDS],
    status: feature[FEATURE_STATUS],
    last_seen: feature[FEATURE_LAST_SEEN],
    tags: feature[FEATURE_TAGS],
    meta: feature[FEATURE_META],
    expires_at: feature[FEATURE_EXPIRES_AT],
    deleted_at: feature[FEATURE_DELETED_AT],
    title: feature[FEATURE_TITLE],
  };
}
