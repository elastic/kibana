/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateRangeQuery, termQuery, termsQuery } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IStorageClient } from '@kbn/storage-adapter';
import type { Feature } from '@kbn/streams-schema';
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
    const filteredOperations = await this.filterValidOperations(stream, operations);

    return await this.clients.storageClient.bulk({
      operations: filteredOperations.map((operation) => {
        if ('index' in operation) {
          const document = toStorage(stream, operation.index.feature);
          return {
            index: {
              document,
              _id: document[FEATURE_UUID],
            },
          };
        }

        return { delete: { _id: operation.delete.id } };
      }),
      throwOnFail: true,
    });
  }

  async getFeatures(
    stream: string,
    filters?: { type?: string[]; id?: string[]; minConfidence?: number; limit?: number }
  ): Promise<{ hits: Feature[]; total: number }> {
    const filterClauses: QueryDslQueryContainer[] = [
      ...termQuery(STREAM_NAME, stream),
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

  async getFeature(stream: string, uuid: string) {
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
    return fromStorage(source);
  }

  async deleteFeature(stream: string, uuid: string) {
    const feature = await this.getFeature(stream, uuid);
    return await this.clients.storageClient.delete({ id: feature.uuid });
  }

  async deleteFeatures(stream: string) {
    const features = await this.getFeatures(stream);
    return await this.clients.storageClient.bulk({
      operations: features.hits.map((feature) => ({
        delete: { _id: feature.uuid },
      })),
    });
  }

  async getAllFeatures(streams: string[]): Promise<{ hits: Feature[]; total: number }> {
    if (streams.length === 0) {
      return { hits: [], total: 0 };
    }

    const featuresResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: true,
      query: {
        bool: {
          filter: [{ terms: { [STREAM_NAME]: streams } }],
        },
      },
    });

    return {
      hits: featuresResponse.hits.hits.map((hit) => fromStorage(hit._source)),
      total: featuresResponse.hits.total.value,
    };
  }

  private async filterValidOperations(
    stream: string,
    operations: FeatureBulkOperation[]
  ): Promise<FeatureBulkOperation[]> {
    const deleteIds = operations.flatMap((op) => ('delete' in op ? op.delete.id : []));

    const validDeleteIds =
      deleteIds.length > 0
        ? new Set(
            (
              await this.clients.storageClient.search({
                size: deleteIds.length,
                track_total_hits: false,
                query: {
                  bool: {
                    filter: [{ terms: { _id: deleteIds } }, ...termQuery(STREAM_NAME, stream)],
                  },
                },
              })
            ).hits.hits.flatMap((hit) => hit._id ?? [])
          )
        : new Set<string>();

    return operations.filter(
      (operation) => 'index' in operation || validDeleteIds.has(operation.delete.id)
    );
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
    [FEATURE_STATUS]: feature.status,
    [FEATURE_LAST_SEEN]: feature.last_seen,
    [FEATURE_TAGS]: feature.tags,
    [STREAM_NAME]: stream,
    [FEATURE_META]: feature.meta,
    [FEATURE_EXPIRES_AT]: feature.expires_at,
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
    status: feature[FEATURE_STATUS],
    last_seen: feature[FEATURE_LAST_SEEN],
    tags: feature[FEATURE_TAGS],
    meta: feature[FEATURE_META],
    expires_at: feature[FEATURE_EXPIRES_AT],
    title: feature[FEATURE_TITLE],
  };
}
