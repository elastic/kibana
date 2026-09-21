/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerSortShorthand } from '@elastic/esql';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  KNOWLEDGE_INDICATORS_DATA_STREAM,
  isStoredFeatureKnowledgeIndicator,
  type StoredFeatureKnowledgeIndicator,
  type StoredKnowledgeIndicator,
} from '../data_stream';
import { combineWhere, inPredicate, inSpace, IS_NOT_DELETED } from '../esql_helpers';
import {
  esqlToObjects,
  executeAndDecodeSource,
  pickLatestPerGroup,
  withSort,
  withWhere,
  type LatestSourceGroupBy,
  type LatestSourceWhereCondition,
} from '../../significant_events/latest_source_query';
import { runEsqlQuery } from '../../significant_events/run_esql_query';
import { ID, KI_TYPE_FEATURE, SOURCE_ID, TYPE } from '../fields';

export const REVISION_SIZE_LIMIT = 10_000;

/**
 * Identity of a knowledge indicator revision within a space. The space filter
 * must be applied before this grouping: feature ids are derived from
 * `(source_id, slug)`, so the same stream onboarded from two spaces yields the
 * same `id` in both and one space's revision would otherwise shadow the other's.
 */
const REVISION_GROUP_KEY: LatestSourceGroupBy = [SOURCE_ID, TYPE, ID];

/**
 * Space-scoped access to raw knowledge indicator revisions. Every query starts
 * from `inSpace(space)`; nothing in this class can read another space's data.
 */
export class RevisionReader {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly space: string
  ) {}

  async fetchLatestRevisions(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition,
    sort?: ComposerSortShorthand[],
    limit: number = REVISION_SIZE_LIMIT
  ): Promise<StoredKnowledgeIndicator[]> {
    let query = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], ['_id', '_source']).where`${inSpace(
      this.space
    )}`;
    query = withWhere(query, where);
    query = pickLatestPerGroup(query, REVISION_GROUP_KEY);
    query = withWhere(query, postGroupingWhere);
    query = withSort(query, sort);
    // Cap at REVISION_SIZE_LIMIT regardless of the requested limit so a large
    // caller-supplied value can't fetch an unbounded result set.
    if (limit > REVISION_SIZE_LIMIT) {
      this.logger.debug(
        `Requested revision limit ${limit} exceeds REVISION_SIZE_LIMIT ${REVISION_SIZE_LIMIT}; capping at ${REVISION_SIZE_LIMIT}.`
      );
    }
    query = query.keep('_source').limit(Math.min(limit, REVISION_SIZE_LIMIT));

    const { hits } = await executeAndDecodeSource<StoredKnowledgeIndicator>(this.esClient, query);
    return hits;
  }

  /**
   * Returns the distinct source ids whose latest KI revision satisfies
   * `postGroupingWhere`. Aggregates on `source.id` in ES|QL so the
   * `REVISION_SIZE_LIMIT` cap bounds distinct sources rather than distinct KIs;
   * warns if the cap is hit so partial coverage isn't silent.
   */
  async fetchDistinctSourceIds(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition
  ): Promise<string[]> {
    let query = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], ['_id']).where`${inSpace(
      this.space
    )}`;
    query = withWhere(query, where);
    query = pickLatestPerGroup(query, REVISION_GROUP_KEY);
    query = withWhere(query, postGroupingWhere);
    query = query.pipe`STATS __count = COUNT(*) BY sourceId = ${esql.col(SOURCE_ID)}`
      .keep('sourceId')
      .limit(REVISION_SIZE_LIMIT);

    // `runEsqlQuery` (not `queryEsql`) so a not-yet-created data stream yields
    // `[]` instead of throwing — the sweep can run before any KI is written.
    const response = await runEsqlQuery(this.esClient, query.print('basic'));
    if (!response) {
      return [];
    }

    const rows = esqlToObjects<{ sourceId?: unknown }>(response);

    if (rows.length >= REVISION_SIZE_LIMIT) {
      this.logger.warn(
        `Distinct source enumeration hit REVISION_SIZE_LIMIT (${REVISION_SIZE_LIMIT}); some sources with knowledge indicators may be omitted from this result.`
      );
    }

    return rows.map((row) => row.sourceId).filter((id): id is string => typeof id === 'string');
  }

  async fetchLatestFeatures(
    sourceId: string,
    ids: string[]
  ): Promise<StoredFeatureKnowledgeIndicator[]> {
    if (ids.length === 0) return [];
    const where = combineWhere(
      inPredicate(TYPE, [KI_TYPE_FEATURE]),
      inPredicate(SOURCE_ID, [sourceId]),
      inPredicate(ID, ids)
    );
    const docs = await this.fetchLatestRevisions(where, IS_NOT_DELETED);
    return docs.filter(isStoredFeatureKnowledgeIndicator);
  }
}
