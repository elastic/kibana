/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateRangeQuery, termQuery, termsQuery } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { esql, type ComposerQuery, type ComposerQueryTagHole } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { IStorageClient } from '@kbn/storage-adapter';
import type { Logger } from '@kbn/core/server';
import type { BaseFeature, Feature } from '@kbn/streams-schema';
import { isDuplicateFeature, isComputedFeature } from '@kbn/streams-schema';
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
  FEATURE_RUN_ID,
  FEATURE_SEARCH_EMBEDDING,
} from './fields';
import type { FeatureStorageSettings } from './storage_settings';
import type { StoredFeature } from './stored_feature';
import { StatusError } from '../errors/status_error';
import { bulkWithInferenceFallback } from '../errors/bulk_with_inference_fallback';
import { searchWithKeywordFallback } from '../errors/search_with_keyword_fallback';
import {
  normalizeColumn,
  getColumnIndex,
  getSourceColumnIndex,
  mapSourceRows,
} from '../helpers/esql';
import type { SearchMode } from '../../../../common/queries';
import {
  DEFAULT_SIG_EVENTS_TUNING_CONFIG,
  type SigEventsTuningConfig,
} from '../../../../common/sig_events_tuning_config';

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

type WhereCondition = ESQLAstExpression & ComposerQueryTagHole;

// `EVAL CASE` chain mirrors the DSL `wildcard(boost: N)` ranking so result order
// is identical between the keyword and ES|QL search paths.
function appendKeywordEsqlPipeline(searchTerm: string, size: number): ComposerQuery {
  const lowerWildcard = esql.str(`*${escapeWildcard(searchTerm.toLowerCase())}*`);
  const tagTokens = searchTerm
    .split(/\s+/)
    .filter((t) => t.length > 3)
    .map((t) => esql.str(t.toLowerCase()));

  const titleCol = normalizeColumn(FEATURE_TITLE);
  const descCol = normalizeColumn(FEATURE_DESCRIPTION);
  const typeCol = normalizeColumn(FEATURE_TYPE);
  const subtypeCol = normalizeColumn(FEATURE_SUBTYPE);
  const tagsCol = normalizeColumn(FEATURE_TAGS);

  let tagOrExpr: WhereCondition | undefined;
  for (const tokenLit of tagTokens) {
    const cond = esql.exp`MV_CONTAINS(TO_LOWER(${tagsCol}), ${tokenLit})`;
    tagOrExpr = tagOrExpr ? esql.exp`${tagOrExpr} OR ${cond}` : cond;
  }

  let whereExpr: WhereCondition = esql.exp`TO_LOWER(${titleCol}) LIKE ${lowerWildcard}
    OR TO_LOWER(${descCol}) LIKE ${lowerWildcard}
    OR TO_LOWER(${typeCol}) LIKE ${lowerWildcard}
    OR TO_LOWER(${subtypeCol}) LIKE ${lowerWildcard}`;
  if (tagOrExpr) {
    whereExpr = esql.exp`${whereExpr} OR ${tagOrExpr}`;
  }

  const tagHitCase: WhereCondition = tagOrExpr
    ? esql.exp`CASE(${tagOrExpr}, 1.0, 0.0)`
    : esql.exp`0.0`;

  return esql`WHERE ${whereExpr}
    | EVAL _kw_title_hit = CASE(TO_LOWER(${titleCol}) LIKE ${lowerWildcard}, 3.0, 0.0)
    | EVAL _kw_desc_hit = CASE(TO_LOWER(${descCol}) LIKE ${lowerWildcard}, 2.0, 0.0)
    | EVAL _kw_type_hit = CASE(TO_LOWER(${typeCol}) LIKE ${lowerWildcard}, 1.0, 0.0)
    | EVAL _kw_subtype_hit = CASE(TO_LOWER(${subtypeCol}) LIKE ${lowerWildcard}, 1.0, 0.0)
    | EVAL _kw_tag_hit = ${tagHitCase}
    | EVAL _kw_score = _kw_title_hit + _kw_desc_hit + _kw_type_hit + _kw_subtype_hit + _kw_tag_hit
    | SORT _kw_score DESC, _id ASC
    | KEEP _id, _source
    | LIMIT ${esql.num(size)}`;
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

export class FeatureClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<FeatureStorageSettings, StoredFeature>;
      logger: Logger;
    },
    private readonly config: Pick<
      SigEventsTuningConfig,
      'feature_ttl_days' | 'semantic_min_score' | 'rrf_rank_constant'
    > = DEFAULT_SIG_EVENTS_TUNING_CONFIG
  ) {}

  private get maxFeatureAgeMs(): number {
    return this.config.feature_ttl_days * 24 * 60 * 60 * 1000;
  }

  async clean() {
    await this.clients.storageClient.clean();
  }

  async bulk(
    stream: string,
    operations: FeatureBulkOperation[]
  ): Promise<{ applied: number; skipped: number }> {
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
      sortBy?: 'confidence' | 'lastSeen';
    } = {}
  ): Promise<{ hits: Feature[] }> {
    const streamNames = Array.isArray(streams) ? streams : [streams];
    if (streamNames.length === 0) {
      return { hits: [] };
    }

    const filterClauses: QueryDslQueryContainer[] = [
      ...termsQuery(STREAM_NAME, streamNames),
      ...(options.id?.length ? termsQuery(FEATURE_ID, options.id) : []),
      ...buildBaseFilters(options),
    ];

    const sortField = options.sortBy === 'lastSeen' ? FEATURE_LAST_SEEN : FEATURE_CONFIDENCE;
    const size = options.limit ?? 10_000;
    const response = await this.clients.storageClient.esql({
      metadata: ['_id', '_source'],
      pipeline: esql`SORT ${normalizeColumn(sortField)} DESC | LIMIT ${esql.num(size)}`,
      filter: { bool: { filter: filterClauses } },
    });

    return { hits: mapSourceRows<StoredFeature, Feature>(response, fromStorage) };
  }

  async getFeature(stream: string, uuid: string) {
    const response = await this.clients.storageClient.esql({
      metadata: ['_id', '_source'],
      pipeline: esql`WHERE _id == ${{ uuid }} AND ${normalizeColumn(STREAM_NAME)} == ${{
        stream,
      }} | LIMIT 1`,
    });

    const sourceIdx = getSourceColumnIndex(response);
    const row = sourceIdx !== -1 ? response.values[0] : undefined;
    if (!row) {
      throw new StatusError(`Feature ${uuid} not found`, 404);
    }
    return fromStorage(row[sourceIdx] as StoredFeature);
  }

  /**
   * Resolves a list of feature UUIDs to their owning stream by querying storage
   * directly on `_id` (which is the UUID by construction — see `bulk` above).
   * UUIDs that do not exist in storage are simply absent from the result; the
   * caller can compute "not found" as `input.length - result.length` (deduped)
   * and treat them as idempotent no-ops.
   */
  async findFeaturesByUuids(
    uuids: string[]
  ): Promise<Array<{ uuid: string; stream_name: string }>> {
    if (uuids.length === 0) {
      return [];
    }

    const idLiterals = uuids.map((id) => esql.str(id));
    const response = await this.clients.storageClient.esql({
      metadata: ['_id', '_source'],
      pipeline: esql`WHERE _id IN (${idLiterals}) | LIMIT ${esql.num(uuids.length)}`,
    });

    const idIdx = getColumnIndex(response, '_id');
    const sourceIdx = getSourceColumnIndex(response);
    if (idIdx === -1 || sourceIdx === -1) return [];

    return response.values.map((row) => ({
      uuid: row[idIdx] as string,
      stream_name: (row[sourceIdx] as StoredFeature)[STREAM_NAME] as string,
    }));
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

  async getExcludedFeatures(stream: string): Promise<{ hits: Feature[] }> {
    const response = await this.clients.storageClient.esql({
      metadata: ['_id', '_source'],
      pipeline: esql`WHERE ${normalizeColumn(STREAM_NAME)} == ${{ stream }} AND ${normalizeColumn(
        FEATURE_EXCLUDED_AT
      )} IS NOT NULL | SORT ${normalizeColumn(FEATURE_EXCLUDED_AT)} DESC | LIMIT ${esql.num(
        10_000
      )}`,
    });

    return { hits: mapSourceRows<StoredFeature, Feature>(response, fromStorage) };
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
  ): Promise<{ hits: Feature[] }> {
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
  ): Promise<{ hits: Feature[] }> {
    const streamNames = Array.isArray(streams) ? streams : [streams];
    if (streamNames.length === 0) {
      return { hits: [] };
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
  ): Promise<{ hits: Feature[] }> {
    const size = limit ?? SEARCH_SIZE_LIMIT;
    const response = await this.clients.storageClient.esql({
      metadata: ['_id', '_source'],
      pipeline: appendKeywordEsqlPipeline(query, size),
      filter: { bool: { filter } },
    });

    return { hits: mapSourceRows<StoredFeature, Feature>(response, fromStorage) };
  }

  // Stays on DSL: ES|QL has no equivalent of `linear.min_score` for semantic retrievers.
  private async findFeaturesBySemantic(
    filter: QueryDslQueryContainer[],
    query: string,
    limit?: number
  ): Promise<{ hits: Feature[] }> {
    const response = await this.clients.storageClient.search({
      size: limit ?? SEARCH_SIZE_LIMIT,
      track_total_hits: false,
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
          min_score: this.config.semantic_min_score,
        },
      },
    });

    return {
      hits: response.hits.hits.map((hit) => fromStorage(hit._source)),
    };
  }

  // Stays on DSL: ES|QL has no equivalent of the RRF retriever with semantic min_score.
  private async findFeaturesByHybrid(
    filter: QueryDslQueryContainer[],
    query: string,
    limit?: number
  ): Promise<{ hits: Feature[] }> {
    const response = await this.clients.storageClient.search({
      size: limit ?? SEARCH_SIZE_LIMIT,
      track_total_hits: false,
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
                min_score: this.config.semantic_min_score,
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
          rank_constant: this.config.rrf_rank_constant,
        },
      },
    });

    return {
      hits: response.hits.hits.map((hit) => fromStorage(hit._source)),
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

    const validHits: Array<{ id: string; feature: Feature }> =
      idsToValidate.length > 0
        ? await (async () => {
            const idLiterals = idsToValidate.map((id) => esql.str(id));
            const response = await this.clients.storageClient.esql({
              metadata: ['_id', '_source'],
              pipeline: esql`WHERE _id IN (${idLiterals}) AND ${normalizeColumn(STREAM_NAME)} == ${{
                stream,
              }} | LIMIT ${esql.num(idsToValidate.length)}`,
            });
            const idIdx = getColumnIndex(response, '_id');
            const sourceIdx = getSourceColumnIndex(response);
            if (idIdx === -1 || sourceIdx === -1) return [];
            return response.values.map((row) => ({
              id: row[idIdx] as string,
              feature: fromStorage(row[sourceIdx] as StoredFeature),
            }));
          })()
        : [];

    const now = new Date().toISOString();
    const validatedOps: Array<FeatureBulkIndexOperation | FeatureBulkDeleteOperation> = [];

    for (const op of operations) {
      if ('index' in op) {
        validatedOps.push(op);
      }
    }

    for (const { id, feature } of validHits) {
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
              expires_at: new Date(Date.now() + this.maxFeatureAgeMs).toISOString(),
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
    [FEATURE_RUN_ID]: feature.run_id,
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
    run_id: feature[FEATURE_RUN_ID],
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
