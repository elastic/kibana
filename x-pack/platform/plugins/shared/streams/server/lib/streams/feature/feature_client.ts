/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateRangeQuery, termQuery, termsQuery } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IStorageClient } from '@kbn/storage-adapter';
import type { Logger } from '@kbn/core/server';
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
  FEATURE_SEARCH_EMBEDDING,
} from './fields';
import type { FeatureStorageSettings } from './storage_settings';
import type { StoredFeature } from './stored_feature';
import { StatusError } from '../errors/status_error';
import { bulkWithInferenceFallback } from '../errors/bulk_with_inference_fallback';
import { searchWithKeywordFallback } from '../errors/search_with_keyword_fallback';
import type { SearchMode } from '../../../../common/queries';

/**
 * The default min_score is now normalized to 0-1 range, as different inference models could have different scales (ELSER, Jina,...).
 *
 * This threshold may need tuning as the dataset evolves. If legitimate
 * matches are being excluded, lower it; if noise creeps back in, raise it.
 */
const SEMANTIC_MIN_SCORE = 0.15;

const SEARCH_SIZE_LIMIT = 10_000;

function escapeWildcard(input: string): string {
  return input.replace(/[\\*?]/g, '\\$&');
}

function wildcardQuery<T extends string>(
  field: T,
  value: string | undefined,
  opts: { boost?: number } = {}
): QueryDslQueryContainer[] {
  if (!value) return [];
  return [
    {
      wildcard: {
        [field]: {
          value: `*${escapeWildcard(value)}*`,
          case_insensitive: true,
          ...(opts.boost !== undefined && { boost: opts.boost }),
        },
      },
    },
  ];
}

function tagsQuery(field: string, query: string): QueryDslQueryContainer[] {
  const tokens = query.split(/\s+/).filter((value) => value.length > 3);
  if (tokens.length === 0) return [];

  return tokens.map((token) => ({
    term: { [field]: { value: token, case_insensitive: true } },
  }));
}

function buildKeywordQuery(
  query: string,
  filter: QueryDslQueryContainer[]
): QueryDslQueryContainer {
  return {
    bool: {
      filter,
      should: [
        ...wildcardQuery(FEATURE_TITLE, query, { boost: 3 }),
        ...wildcardQuery(FEATURE_DESCRIPTION, query, { boost: 2 }),
        ...wildcardQuery(FEATURE_TYPE, query),
        ...wildcardQuery(FEATURE_SUBTYPE, query),
        ...tagsQuery(FEATURE_TAGS, query),
      ],
      minimum_should_match: 1,
    },
  };
}

function buildBaseFilters({
  includeExpired,
  includeExcluded,
  type,
  minConfidence,
}: {
  includeExpired?: boolean;
  includeExcluded?: boolean;
  type?: string[];
  minConfidence?: number;
}): QueryDslQueryContainer[] {
  const filters = [];

  if (!includeExpired) {
    filters.push({
      bool: {
        should: [
          { bool: { must_not: { exists: { field: FEATURE_EXPIRES_AT } } } },
          ...dateRangeQuery(Date.now(), undefined, FEATURE_EXPIRES_AT),
        ],
        minimum_should_match: 1,
      },
    });
  }

  if (!includeExcluded) {
    filters.push({
      bool: { must_not: { exists: { field: FEATURE_EXCLUDED_AT } } },
    });
  }

  if (type?.length) {
    filters.push({
      bool: {
        should: type.flatMap((t) => termQuery(FEATURE_TYPE, t)),
        minimum_should_match: 1,
      },
    });
  }

  if (typeof minConfidence === 'number') {
    filters.push({
      range: {
        [FEATURE_CONFIDENCE]: {
          gte: minConfidence,
        },
      },
    });
  }

  return filters;
}

export function buildSearchEmbeddingText(feature: BaseFeature, streamName?: string): string {
  const parts: string[] = [];
  if (streamName) parts.push(`Stream: ${streamName}`);
  if (feature.title) parts.push(`Title: ${feature.title}`);
  if (feature.description) parts.push(`Description: ${feature.description}`);
  if (feature.type) parts.push(`Type: ${feature.type}`);
  if (feature.subtype) parts.push(`Subtype: ${feature.subtype}`);
  if ((feature.tags?.length ?? 0) > 0) parts.push(`Tags: ${feature.tags?.join(', ')}`);
  return parts.join('\n');
}

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
      logger: Logger;
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

    const skipped = operations.length - resolvedOperations.length;

    if (resolvedOperations.length === 0) {
      return { applied: 0, skipped };
    }

    await bulkWithInferenceFallback(this.clients.logger, ({ includeEmbedding }) =>
      this.clients.storageClient.bulk({
        operations: resolvedOperations.map((operation) => {
          if ('index' in operation) {
            const document = toStorage(stream, operation.index.feature, includeEmbedding);
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
      })
    );

    return { applied: resolvedOperations.length, skipped };
  }

  async getFeatures(
    streams: string | string[],
    options: {
      type?: string[];
      id?: string[];
      minConfidence?: number;
      limit?: number;
      includeExcluded?: boolean;
      includeExpired?: boolean;
    } = {}
  ): Promise<{ hits: Feature[]; total: number }> {
    const streamNames = Array.isArray(streams) ? streams : [streams];
    if (streamNames.length === 0) {
      return { hits: [], total: 0 };
    }

    const filterClauses: QueryDslQueryContainer[] = [
      ...termsQuery(STREAM_NAME, streamNames),
      ...(options.id?.length ? termsQuery(FEATURE_ID, options.id) : []),
      ...buildBaseFilters(options),
    ];

    const featuresResponse = await this.clients.storageClient.search({
      size: options.limit ?? 10_000,
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

  async findFeatures(
    streams: string | string[],
    query: string,
    options?: {
      searchMode?: SearchMode;
      includeExpired?: boolean;
      includeExcluded?: boolean;
      limit?: number;
    }
  ): Promise<{ hits: Feature[]; total: number }> {
    const streamNames = Array.isArray(streams) ? streams : [streams];

    return searchWithKeywordFallback(
      this.clients.logger,
      { searchMode: options?.searchMode, label: 'Feature', streamNames },
      (mode) => this.executeFindFeatures(mode, streams, query, options)
    );
  }

  private async executeFindFeatures(
    mode: SearchMode,
    streams: string | string[],
    query: string,
    options: {
      limit?: number;
      includeExpired?: boolean;
      includeExcluded?: boolean;
    } = {}
  ): Promise<{ hits: Feature[]; total: number }> {
    const streamNames = Array.isArray(streams) ? streams : [streams];
    if (streamNames.length === 0) {
      return { hits: [], total: 0 };
    }

    const filter: QueryDslQueryContainer[] = [
      ...termsQuery(STREAM_NAME, streamNames),
      ...buildBaseFilters(options),
    ];

    if (mode === 'keyword') {
      return this.findFeaturesByKeyword(filter, query, options.limit);
    }

    if (mode === 'semantic') {
      return this.findFeaturesBySemantic(filter, query, options.limit);
    }

    return this.findFeaturesByHybrid(filter, query, options.limit);
  }

  private async findFeaturesByKeyword(
    filter: QueryDslQueryContainer[],
    query: string,
    limit?: number
  ): Promise<{ hits: Feature[]; total: number }> {
    const response = await this.clients.storageClient.search({
      size: limit ?? SEARCH_SIZE_LIMIT,
      track_total_hits: true,
      query: buildKeywordQuery(query, filter),
    });

    return {
      hits: response.hits.hits.map((hit) => fromStorage(hit._source)),
      total: response.hits.total.value,
    };
  }

  private async findFeaturesBySemantic(
    filter: QueryDslQueryContainer[],
    query: string,
    limit?: number
  ): Promise<{ hits: Feature[]; total: number }> {
    const response = await this.clients.storageClient.search({
      size: limit ?? SEARCH_SIZE_LIMIT,
      track_total_hits: true,
      retriever: {
        linear: {
          retrievers: [
            {
              retriever: {
                standard: {
                  query: {
                    match: { [FEATURE_SEARCH_EMBEDDING]: query },
                  },
                  filter: { bool: { filter } },
                },
              },
              weight: 1,
              normalizer: 'minmax',
            },
          ],
          rank_window_size: limit ?? SEARCH_SIZE_LIMIT,
          min_score: SEMANTIC_MIN_SCORE,
        },
      },
    });

    return {
      hits: response.hits.hits.map((hit) => fromStorage(hit._source)),
      total: response.hits.total.value,
    };
  }

  private async findFeaturesByHybrid(
    filter: QueryDslQueryContainer[],
    query: string,
    limit?: number
  ): Promise<{ hits: Feature[]; total: number }> {
    const response = await this.clients.storageClient.search({
      size: limit ?? SEARCH_SIZE_LIMIT,
      track_total_hits: true,
      retriever: {
        rrf: {
          retrievers: [
            {
              standard: {
                // Keyword leg uses empty filter — stream filters are
                // applied at the RRF level to avoid double-filtering.
                query: buildKeywordQuery(query, []),
              },
            },
            {
              linear: {
                retrievers: [
                  {
                    retriever: {
                      standard: {
                        query: {
                          match: { [FEATURE_SEARCH_EMBEDDING]: query },
                        },
                      },
                    },
                    weight: 1,
                    normalizer: 'minmax',
                  },
                ],
                rank_window_size: limit ?? SEARCH_SIZE_LIMIT,
                min_score: SEMANTIC_MIN_SCORE,
              },
            },
          ],
          filter: {
            bool: {
              filter,
            },
          },
          rank_window_size: limit ?? SEARCH_SIZE_LIMIT,
          // Lower than the ES default (60) to give more weight to top-ranked
          // results from each retriever, improving precision for small catalogs.
          rank_constant: 20,
        },
      },
    });

    return {
      hits: response.hits.hits.map((hit) => fromStorage(hit._source)),
      total: response.hits.total.value,
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

function toStorage(stream: string, feature: Feature, includeEmbedding: boolean): StoredFeature {
  const embeddingText = buildSearchEmbeddingText(feature, stream);
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
    ...(includeEmbedding && embeddingText ? { [FEATURE_SEARCH_EMBEDDING]: embeddingText } : {}),
  } as StoredFeature;
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
