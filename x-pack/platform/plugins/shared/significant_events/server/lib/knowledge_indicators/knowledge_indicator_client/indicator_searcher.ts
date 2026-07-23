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
  FEATURE_TYPE,
  ID,
  KI_TYPE_FEATURE,
  KI_TYPE_QUERY,
  QUERY_ESQL,
  SEARCH_EMBEDDING,
  STREAM_NAME,
  TAGS,
  TIMESTAMP,
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

type RankedIndicatorRow = Record<string, unknown> & {
  id?: string;
  'stream.name'?: string;
  type?: KnowledgeIndicatorType;
  '@timestamp'?: string;
};

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

// Columns ranking must return so the caller can key each row and match the phase-1 latest revision.
const rankGroupKeyColumns = () => [
  esql.col(ID),
  esql.col(STREAM_NAME),
  esql.col(TYPE),
  esql.col(TIMESTAMP),
];

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
    options: { searchMode?: SearchMode; limit?: number; includeExcluded?: boolean } = {}
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
    filters?: { ruleUnbacked?: RuleUnbackedFilter },
    searchMode?: SearchMode
  ): Promise<QueryLink[]> {
    const { hits } = await this.findIndicators(streams, query, {
      types: [KI_TYPE_QUERY],
      searchMode,
    });
    const queryLinks = hits.flatMap((h) => (h.type === 'query' ? [h.query] : []));
    if (!filters?.ruleUnbacked || filters.ruleUnbacked === 'include') {
      return queryLinks;
    }
    if (filters.ruleUnbacked === 'only') {
      return queryLinks.filter((q) => !q.rule_backed);
    }
    return queryLinks.filter((q) => q.rule_backed);
  }

  private async executeFindIndicators(
    mode: SearchMode,
    streamNames: string[],
    queryText: string,
    options: { types?: KnowledgeIndicatorType[]; limit?: number; includeExcluded?: boolean }
  ): Promise<{ hits: KnowledgeIndicator[] }> {
    // Phase 1: ES|QL latest-per-group reduction.
    const where = combineWhere(
      inPredicate(STREAM_NAME, streamNames),
      inPredicate(TYPE, options.types ?? [])
    );
    // Default: drop tombstones and excluded revisions. Queries don't write
    // `excluded`, so the filter is a no-op for them. `includeExcluded`
    // relaxes back to drop-tombstones-only.
    const postGroupingWhere = combineWhere(
      IS_NOT_DELETED,
      options.includeExcluded ? undefined : IS_NOT_EXCLUDED
    );
    const docs = await this.revisionReader.fetchLatestRevisions(where, postGroupingWhere);
    const docById = new Map(docs.map((d) => [`${d['stream.name']}:${d.type}:${d.id}`, d]));

    // Phase 2: rank via ES|QL on the latest doc subset. We re-issue a query
    // constrained by the (stream.name, type, id) tuples from phase 1.
    if (docById.size === 0) {
      return { hits: [] };
    }

    const ids = Array.from(new Set(docs.map((d) => d.id)));
    const limit = options.limit ?? SEARCH_SIZE_LIMIT;
    const phase2Where = combineWhere(
      inPredicate(ID, ids),
      inPredicate(STREAM_NAME, streamNames),
      inPredicate(TYPE, options.types ?? [])
    );
    if (!phase2Where) {
      return { hits: [] };
    }

    const query = this.buildRankQuery(mode, phase2Where, queryText, options.types ?? [], limit);
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
      const id = row[ID];
      const streamName = row[STREAM_NAME];
      const type = row[TYPE];
      const timestamp = row[TIMESTAMP];
      if (
        typeof id !== 'string' ||
        typeof streamName !== 'string' ||
        typeof type !== 'string' ||
        typeof timestamp !== 'string'
      ) {
        continue;
      }
      const key = `${streamName}:${type}:${id}`;
      if (seen.has(key)) continue;
      const latest = docById.get(key);
      if (!latest || new Date(latest[TIMESTAMP]).getTime() !== new Date(timestamp).getTime()) {
        continue;
      }
      seen.add(key);
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
    limit: number
  ): ComposerQuery {
    if (mode === 'semantic') {
      return esql`FROM ${KNOWLEDGE_INDICATORS_DATA_STREAM} METADATA _score, _id, _index
        | WHERE ${where}
        | FORK (
            WHERE MATCH(${esql.col(SEARCH_EMBEDDING)}, ${{ q: queryText }})
            | SORT _score DESC
            | LIMIT ${limit}
          )
        | FUSE LINEAR WITH {"normalizer":"minmax"}
        | WHERE _score >= ${this.config.semantic_min_score}
        | KEEP _id, _index, _score, ${rankGroupKeyColumns()}
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
        | KEEP _id, _index, _score, ${rankGroupKeyColumns()}
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
            | WHERE _score >= ${this.config.semantic_min_score}
            | KEEP _id, _index, _score, ${rankGroupKeyColumns()}
            | SORT _score DESC
            | LIMIT ${limit}
          )
          (
            WHERE ${keyword.condition}
            | EVAL _score = ${keyword.score}
            | WHERE _score > 0
            | SORT _score DESC
            | LIMIT ${limit}
            | KEEP _id, _index, _score, ${rankGroupKeyColumns()}
          )
      | FUSE RRF WITH {"rank_constant":${this.config.rrf_rank_constant}}
      | SORT _score DESC
      | KEEP ${rankGroupKeyColumns()}, _score
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
