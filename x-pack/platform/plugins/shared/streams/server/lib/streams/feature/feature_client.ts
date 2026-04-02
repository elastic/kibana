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
import { isDuplicateFeature, isComputedFeature } from '@kbn/streams-schema';
import { isNotFoundError } from '@kbn/es-errors';
import { isConditionComplete } from '@kbn/streamlang';
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
  FEATURE_EXCLUDED_AT,
  FEATURE_FILTER,
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
interface FeatureBulkExcludeOperation {
  exclude: { id: string };
}
interface FeatureBulkRestoreOperation {
  restore: { id: string };
}

export type FeatureBulkOperation =
  | FeatureBulkIndexOperation
  | FeatureBulkDeleteOperation
  | FeatureBulkExcludeOperation
  | FeatureBulkRestoreOperation;

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
    validateFeatures(
      operations
        .filter((operation) => 'index' in operation)
        .map((operation) => operation.index.feature)
    );

    const resolvedOperations = await this.filterValidOperations(stream, operations);

    return await this.clients.storageClient.bulk({
      operations: resolvedOperations.map((operation) => {
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
    streams: string | string[],
    filters?: {
      type?: string[];
      id?: string[];
      minConfidence?: number;
      limit?: number;
      includeExcluded?: boolean;
      includeExpired?: boolean;
    }
  ): Promise<{ hits: Feature[]; total: number }> {
    const streamNames = Array.isArray(streams) ? streams : [streams];
    if (streamNames.length === 0) {
      return { hits: [], total: 0 };
    }

    const filterClauses: QueryDslQueryContainer[] = [
      ...termsQuery(STREAM_NAME, streamNames),
      ...(filters?.id?.length ? termsQuery(FEATURE_ID, filters.id) : []),
    ];

    if (!filters?.includeExpired) {
      filterClauses.push({
        bool: {
          should: [
            { bool: { must_not: { exists: { field: FEATURE_EXPIRES_AT } } } },
            ...dateRangeQuery(Date.now(), undefined, FEATURE_EXPIRES_AT),
          ],
          minimum_should_match: 1,
        },
      });
    }

    if (!filters?.includeExcluded) {
      filterClauses.push({
        bool: { must_not: { exists: { field: FEATURE_EXCLUDED_AT } } },
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
    const features = await this.getFeatures(stream, {
      includeExcluded: true,
      includeExpired: true,
    });
    return await this.clients.storageClient.bulk({
      operations: features.hits.map((feature) => ({
        delete: { _id: feature.uuid },
      })),
    });
  }

  async getExcludedFeatures(stream: string): Promise<{ hits: Feature[]; total: number }> {
    const featuresResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: true,
      query: {
        bool: {
          filter: [...termQuery(STREAM_NAME, stream), { exists: { field: FEATURE_EXCLUDED_AT } }],
        },
      },
      sort: [{ [FEATURE_EXCLUDED_AT]: { order: 'desc' } }],
    });

    return {
      hits: featuresResponse.hits.hits.map((hit) => fromStorage(hit._source)),
      total: featuresResponse.hits.total.value,
    };
  }

  private async filterValidOperations(
    stream: string,
    operations: FeatureBulkOperation[]
  ): Promise<Array<FeatureBulkIndexOperation | FeatureBulkDeleteOperation>> {
    const deleteIdSet = new Set<string>();
    const excludeIdSet = new Set<string>();
    const restoreIdSet = new Set<string>();
    for (const op of operations) {
      if ('delete' in op) {
        deleteIdSet.add(op.delete.id);
      } else if ('exclude' in op) {
        excludeIdSet.add(op.exclude.id);
      } else if ('restore' in op) {
        restoreIdSet.add(op.restore.id);
      }
    }
    const idsToValidate = [...deleteIdSet, ...excludeIdSet, ...restoreIdSet];

    const validHits =
      idsToValidate.length > 0
        ? (
            await this.clients.storageClient.search({
              size: idsToValidate.length,
              track_total_hits: false,
              query: {
                bool: {
                  filter: [{ terms: { _id: idsToValidate } }, ...termQuery(STREAM_NAME, stream)],
                },
              },
            })
          ).hits.hits
        : [];

    const now = new Date().toISOString();
    const validatedOps: Array<FeatureBulkIndexOperation | FeatureBulkDeleteOperation> = [];

    for (const op of operations) {
      if ('index' in op) {
        validatedOps.push(op);
      }
    }

    for (const hit of validHits) {
      const id = hit._id!;
      const feature = fromStorage(hit._source);

      if (deleteIdSet.has(id)) {
        validatedOps.push({ delete: { id } });
      } else if (excludeIdSet.has(id)) {
        if (isComputedFeature(feature)) {
          continue;
        }
        validatedOps.push({
          index: {
            feature: {
              ...feature,
              excluded_at: now,
            },
          },
        });
      } else if (restoreIdSet.has(id)) {
        if (isComputedFeature(feature)) {
          continue;
        }
        validatedOps.push({
          index: {
            feature: {
              ...feature,
              excluded_at: undefined,
              last_seen: now,
              expires_at: new Date(Date.now() + MAX_FEATURE_AGE_MS).toISOString(),
            },
          },
        });
      }
    }

    return validatedOps;
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
    [FEATURE_EXCLUDED_AT]: feature.excluded_at,
    [FEATURE_TITLE]: feature.title,
    [FEATURE_FILTER]: feature.filter,
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
    excluded_at: feature[FEATURE_EXCLUDED_AT],
    title: feature[FEATURE_TITLE],
    filter: feature[FEATURE_FILTER],
  };
}

function validateFeatures(features: Feature[]) {
  for (const feature of features) {
    if (feature.filter && !isConditionComplete(feature.filter)) {
      throw new StatusError(`Invalid feature ${feature.id}: filter is incomplete`, 400);
    }
  }
}
