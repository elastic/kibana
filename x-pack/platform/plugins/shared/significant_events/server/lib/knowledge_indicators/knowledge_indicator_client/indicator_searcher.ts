/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, esql, type ComposerQuery } from '@elastic/esql';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  Feature,
  KnowledgeIndicator,
  QueryLink,
  SignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import {
  isStoredFeatureKnowledgeIndicator,
  isStoredQueryKnowledgeIndicator,
  KNOWLEDGE_INDICATORS_DATA_STREAM,
} from '../data_stream';
import { combineWhere, inPredicate, IS_NOT_DELETED, IS_NOT_EXCLUDED } from '../esql_helpers';
import {
  DESCRIPTION,
  FEATURE_SUBTYPE,
  FEATURE_SLUG,
  FEATURE_TYPE,
  ID,
  KI_TYPE_FEATURE,
  KI_TYPE_QUERY,
  QUERY_ESQL,
  QUERY_RULE_BACKED,
  QUERY_RULE_ID,
  QUERY_TYPE,
  SEARCH_EMBEDDING,
  STREAM_NAME,
  TAGS,
  TITLE,
  TYPE,
  type KnowledgeIndicatorType,
} from '../fields';
import { fromStoredFeature, fromStoredQuery } from './serializers';
import { searchWithKeywordFallback } from '../../streams/search_with_keyword_fallback';
import {
  esqlToObjects,
  queryEsql,
  type LatestSourceWhereCondition,
} from '../../significant_events/latest_source_query';
import type { SearchMode } from '../../../../common/queries';

import type { RevisionReader } from './revision_reader';
import type { RuleUnbackedFilter } from './types';

const SEARCH_SIZE_LIMIT = 10_000;
const QUERY_FEATURE_ID = 'query.features.id';

type RankedIndicatorRow = Record<string, unknown> & { _id?: string };

interface KeywordClause {
  readonly condition: LatestSourceWhereCondition;
  readonly boost: number;
}

interface KeywordExpressions {
  readonly condition: LatestSourceWhereCondition;
  readonly score: LatestSourceWhereCondition;
}

const combineKeywordClauses = (clauses: KeywordClause[]): KeywordExpressions => {
  const condition = clauses
    .map(({ condition: clause }) => `(${BasicPrettyPrinter.expression(clause)})`)
    .join(' OR ');
  const score = clauses
    .map(
      ({ condition: clause, boost }) =>
        `CASE(${BasicPrettyPrinter.expression(clause)}, ${boost.toFixed(1)}, 0.0)`
    )
    .join(' + ');

  return {
    condition: esql.exp(condition),
    score: esql.exp(score),
  };
};

// Exact Elasticsearch revision identity selected by phase 1.
const rankRevisionColumns = () => [esql.col('_id')];

export class IndicatorSearcher {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly config: Pick<
      SignificantEventsTuningConfig,
      'semantic_min_score' | 'rrf_rank_constant'
    >,
    private readonly revisionReader: RevisionReader
  ) {}

  async findIndicators(
    streams: string | string[],
    query: string,
    options: {
      types?: KnowledgeIndicatorType[];
      searchMode?: SearchMode;
      limit?: number;
      includeExcluded?: boolean;
      featureTypes?: string[];
      featureIds?: string[];
      queryTypes?: string[];
      queryIds?: string[];
      ruleIds?: string[];
      ruleUnbacked?: RuleUnbackedFilter;
      /**
       * Overrides the configured `semantic_min_score` floor for this call.
       * Callers making destructive decisions from search results (e.g. query
       * reconciliation) pass a stricter floor than the recall-tuned default.
       */
      minScore?: number;
    } = {}
  ): Promise<{ hits: KnowledgeIndicator[] }> {
    const streamNames = Array.isArray(streams) ? streams : [streams];
    if (streamNames.length === 0) {
      return { hits: [] };
    }

    return searchWithKeywordFallback(
      this.logger,
      { searchMode: options.searchMode, label: 'KnowledgeIndicator', streamNames },
      (mode) => this.executeFindIndicators(mode, streamNames, query, options)
    );
  }

  async findFeatures(
    streams: string | string[],
    query: string,
    options: {
      searchMode?: SearchMode;
      limit?: number;
      includeExcluded?: boolean;
      featureTypes?: string[];
      featureIds?: string[];
    } = {}
  ): Promise<{ hits: Feature[] }> {
    const { hits } = await this.findIndicators(streams, query, {
      ...options,
      types: [KI_TYPE_FEATURE],
    });
    return {
      hits: hits.flatMap((h) => (h.type === 'feature' ? [h.feature] : [])),
    };
  }

  async findQueries(
    streams: string | string[],
    query: string,
    filters?: {
      ruleUnbacked?: RuleUnbackedFilter;
      queryTypes?: string[];
      queryIds?: string[];
      ruleIds?: string[];
      minScore?: number;
    },
    searchMode?: SearchMode
  ): Promise<QueryLink[]> {
    const { hits } = await this.findIndicators(streams, query, {
      types: [KI_TYPE_QUERY],
      searchMode,
      queryTypes: filters?.queryTypes,
      queryIds: filters?.queryIds,
      ruleIds: filters?.ruleIds,
      ruleUnbacked: filters?.ruleUnbacked,
      minScore: filters?.minScore,
    });
    const queryLinks = hits.flatMap((h) => (h.type === 'query' ? [h.query] : []));
    return queryLinks;
  }

  private async executeFindIndicators(
    mode: SearchMode,
    streamNames: string[],
    queryText: string,
    options: {
      types?: KnowledgeIndicatorType[];
      limit?: number;
      includeExcluded?: boolean;
      featureTypes?: string[];
      featureIds?: string[];
      queryTypes?: string[];
      queryIds?: string[];
      ruleIds?: string[];
      ruleUnbacked?: RuleUnbackedFilter;
      minScore?: number;
    }
  ): Promise<{ hits: KnowledgeIndicator[] }> {
    const hasFeatureKind = options.types?.length === 1 && options.types[0] === KI_TYPE_FEATURE;
    const hasQueryKind = options.types?.length === 1 && options.types[0] === KI_TYPE_QUERY;

    // Default: drop tombstones and excluded revisions. Queries don't write
    // `excluded`, so the filter is a no-op for them. `includeExcluded`
    // relaxes back to drop-tombstones-only.
    const featureTypesFilter =
      hasFeatureKind && options.featureTypes?.length
        ? inPredicate(FEATURE_TYPE, options.featureTypes)
        : undefined;
    const featureIdsFilter =
      hasFeatureKind && options.featureIds?.length
        ? inPredicate(FEATURE_SLUG, options.featureIds)
        : undefined;
    const queryIdsFilter =
      hasQueryKind && options.queryIds?.length ? inPredicate(ID, options.queryIds) : undefined;
    const queryTypesFilter =
      hasQueryKind && options.queryTypes?.length
        ? inPredicate(QUERY_TYPE, options.queryTypes)
        : undefined;
    const ruleIdsFilter =
      hasQueryKind && options.ruleIds?.length
        ? inPredicate(QUERY_RULE_ID, options.ruleIds)
        : undefined;
    const ruleBackedFilter =
      hasQueryKind && options.ruleUnbacked === 'exclude'
        ? esql.exp`${esql.col(QUERY_RULE_BACKED)} == true`
        : hasQueryKind && options.ruleUnbacked === 'only'
        ? esql.exp`${esql.col(QUERY_RULE_BACKED)} == false`
        : undefined;

    // Phase 1: ES|QL latest-per-group reduction.
    // Only immutable identity belongs before precedence/latest selection.
    const where = combineWhere(
      inPredicate(STREAM_NAME, streamNames),
      inPredicate(TYPE, options.types ?? []),
      featureIdsFilter,
      queryIdsFilter
    );

    const postGroupingWhere = combineWhere(
      IS_NOT_DELETED,
      options.includeExcluded ? undefined : IS_NOT_EXCLUDED,
      featureTypesFilter,
      queryTypesFilter,
      ruleIdsFilter,
      ruleBackedFilter
    );

    const docs = await this.revisionReader.fetchLatestRevisions(where, postGroupingWhere);
    const docByRevisionId = new Map(
      docs.flatMap((doc) => (doc._revision_id ? [[doc._revision_id, doc] as const] : []))
    );

    // Phase 2 ranks only the exact authoritative Elasticsearch documents from
    // phase 1. Logical IDs are insufficient because spaces and revisions collide.
    if (docByRevisionId.size === 0) {
      return { hits: [] };
    }

    const limit = options.limit ?? SEARCH_SIZE_LIMIT;
    const phase2Where = inPredicate('_id', [...docByRevisionId.keys()]);
    if (!phase2Where) {
      return { hits: [] };
    }

    const query = this.buildRankQuery(
      mode,
      phase2Where,
      queryText,
      options.types ?? [],
      limit,
      options.minScore
    );
    const rankedRows = esqlToObjects<RankedIndicatorRow>(
      await queryEsql({ esClient: this.esClient, query })
    );

    // Walk the ranked rows and surface each group once, in rank order. A row
    // only counts if its @timestamp matches the group's latest revision — that
    // keeps the search scoped to current state (a stale revision matching the
    // query must not resurface its group). We emit the authoritative latest doc
    // from phase 1 rather than the matched row, so a same-timestamp tie can't
    // surface a non-latest payload. A Set is enough to dedupe.
    const seen = new Set<string>();
    const hits: KnowledgeIndicator[] = [];
    for (const row of rankedRows) {
      const revisionId = row._id;
      if (typeof revisionId !== 'string' || seen.has(revisionId)) continue;
      const latest = docByRevisionId.get(revisionId);
      if (!latest) continue;
      seen.add(revisionId);
      if (isStoredFeatureKnowledgeIndicator(latest)) {
        hits.push({ type: 'feature', feature: fromStoredFeature(latest) });
      } else if (isStoredQueryKnowledgeIndicator(latest)) {
        hits.push({ type: 'query', query: fromStoredQuery(latest) });
      }
    }

    return { hits };
  }

  private buildRankQuery(
    mode: SearchMode,
    where: LatestSourceWhereCondition,
    queryText: string,
    types: KnowledgeIndicatorType[],
    limit: number,
    minScoreOverride?: number
  ): ComposerQuery {
    const semanticMinScore = minScoreOverride ?? this.config.semantic_min_score;
    if (mode === 'semantic') {
      return esql`FROM ${KNOWLEDGE_INDICATORS_DATA_STREAM} METADATA _score, _id, _index
        | WHERE ${where}
        | FORK (
            WHERE MATCH(${esql.col(SEARCH_EMBEDDING)}, ${{ q: queryText }})
            | SORT _score DESC
            | LIMIT ${limit}
          )
        | FUSE LINEAR WITH {"normalizer":"minmax"}
        | WHERE _score >= ${semanticMinScore}
        | KEEP _index, _score, ${rankRevisionColumns()}
        | SORT _score DESC
        | LIMIT ${limit}`;
    }

    const keyword = this.buildKeywordExpressions(queryText, types);
    if (mode === 'keyword') {
      return esql`FROM ${KNOWLEDGE_INDICATORS_DATA_STREAM} METADATA _score, _id, _index
        | WHERE ${where}
        | WHERE ${keyword.condition}
        | EVAL _score = ${keyword.score}
        | WHERE _score > 0
        | KEEP _index, _score, ${rankRevisionColumns()}
        | SORT _score DESC
        | LIMIT ${limit}`;
    }

    // Threshold the semantic branch in-place (FUSE LINEAR + fake group) before RRF-fusing with keyword; final KEEP drops the FUSE keys _id/_index.
    return esql`FROM ${KNOWLEDGE_INDICATORS_DATA_STREAM} METADATA _score, _id, _index
      | WHERE ${where}
      | FORK
          (
            WHERE MATCH(${esql.col(SEARCH_EMBEDDING)}, ${{ q: queryText }})
            | SORT _score DESC
            | LIMIT ${limit}
            | EVAL label = "semantic"
            | FUSE LINEAR GROUP BY label WITH {"normalizer":"minmax"}
            | WHERE _score >= ${semanticMinScore}
            | KEEP _index, _score, ${rankRevisionColumns()}
            | SORT _score DESC
            | LIMIT ${limit}
          )
          (
            WHERE ${keyword.condition}
            | EVAL _score = ${keyword.score}
            | WHERE _score > 0
            | SORT _score DESC
            | LIMIT ${limit}
            | KEEP _index, _score, ${rankRevisionColumns()}
          )
      | FUSE RRF WITH {"rank_constant":${this.config.rrf_rank_constant}}
      | SORT _score DESC
      | KEEP ${rankRevisionColumns()}, _score
      | LIMIT ${limit}`;
  }

  private buildKeywordExpressions(
    queryText: string,
    types: KnowledgeIndicatorType[]
  ): KeywordExpressions {
    const lowerQueryText = queryText.toLowerCase();
    const escaped = lowerQueryText.replace(/[\\*?]/g, '\\$&');
    const lowerWildcard = esql.str(`*${escaped}*`);
    const likeClause = (field: string, boost: number): KeywordClause => ({
      condition: esql.exp`TO_LOWER(${esql.col(field)}) LIKE ${lowerWildcard}`,
      boost,
    });

    const clauses: KeywordClause[] = [likeClause(TITLE, 3), likeClause(DESCRIPTION, 2)];
    const includeFeatures = types.length === 0 || types.includes(KI_TYPE_FEATURE);
    const includeQueries = types.length === 0 || types.includes(KI_TYPE_QUERY);

    if (includeFeatures) {
      // Join the multivalue so substring LIKE works; LIKE is null per-element, and MV_CONTAINS matched whole tags only.
      clauses.push(likeClause(FEATURE_TYPE, 1), likeClause(FEATURE_SUBTYPE, 1), {
        condition: esql.exp`MV_CONCAT(TO_LOWER(${esql.col(TAGS)}), " ") LIKE ${lowerWildcard}`,
        boost: 1,
      });
    }
    if (includeQueries) {
      clauses.push(likeClause(QUERY_ESQL, 1), likeClause(QUERY_FEATURE_ID, 1));
    }

    return combineKeywordClauses(clauses);
  }
}
