/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerSortShorthand } from '@elastic/esql';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  KNOWLEDGE_INDICATORS_DATA_STREAM,
  isStoredFeatureKnowledgeIndicator,
  type StoredFeatureKnowledgeIndicator,
  type StoredKnowledgeIndicator,
} from '../data_stream';
import { combineWhere, inPredicate, IS_NOT_DELETED } from '../esql_helpers';
import {
  esqlToObjects,
  executeAndDecodeSource,
  pickLatestPerGroup,
  withSort,
  withWhere,
  type LatestSourceWhereCondition,
} from '../../significant_events/latest_source_query';
import { runEsqlQuery } from '../../significant_events/run_esql_query';
import { ID, KI_TYPE_FEATURE, STREAM_NAME, TYPE } from '../fields';

export const REVISION_SIZE_LIMIT = 10_000;

export class RevisionReader {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly space: string
  ) {}

  private fromScopedKnowledgeIndicators(columns: string[]) {
    return esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], columns).where`${esql.col(
      'kibana.space_ids'
    )} == ${this.space}`;
  }

  /** Default keeps pre-space KI behavior; named spaces remain exact-match only. */
  private fromKnowledgeIndicators(columns: string[]) {
    if (this.space !== DEFAULT_SPACE_ID) {
      return this.fromScopedKnowledgeIndicators(columns);
    }
    return esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], columns).where`${esql.col(
      'kibana.space_ids'
    )} == ${this.space} OR ${esql.col('kibana.space_ids')} IS NULL`
      .pipe`EVAL __space_priority = CASE(${esql.col('kibana.space_ids')} == ${this.space}, 1, 0)`;
  }

  /** Scoped identity always wins over a colliding unscoped legacy identity. */
  private applyDefaultSpacePrecedence(query: ReturnType<typeof esql.from>) {
    if (this.space !== DEFAULT_SPACE_ID) return query;
    return query.pipe`INLINE STATS __max_space_priority = MAX(__space_priority) BY ${esql.col(
      STREAM_NAME
    )}, ${esql.col(TYPE)}, ${esql.col(ID)}`.where`__space_priority == __max_space_priority`;
  }

  async fetchLatestRevisions(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition,
    sort?: ComposerSortShorthand[],
    limit: number = REVISION_SIZE_LIMIT
  ): Promise<StoredKnowledgeIndicator[]> {
    let query = this.fromKnowledgeIndicators(['_id', '_source']);
    query = withWhere(query, where);
    query = this.applyDefaultSpacePrecedence(query);
    query = pickLatestPerGroup(query, ['stream.name', 'type', 'id']);
    query = withWhere(query, postGroupingWhere);
    query = withSort(query, sort);
    query = query.pipe`EVAL _revision_id = _id`;
    // Cap at REVISION_SIZE_LIMIT regardless of the requested limit so a large
    // caller-supplied value can't fetch an unbounded result set.
    if (limit > REVISION_SIZE_LIMIT) {
      this.logger.debug(
        `Requested revision limit ${limit} exceeds REVISION_SIZE_LIMIT ${REVISION_SIZE_LIMIT}; capping at ${REVISION_SIZE_LIMIT}.`
      );
    }
    query = query.keep('_source', '_revision_id').limit(Math.min(limit, REVISION_SIZE_LIMIT));

    const { hits } = await executeAndDecodeSource<StoredKnowledgeIndicator>(this.esClient, query, {
      revisionIdColumn: '_revision_id',
    });
    return hits;
  }

  /** Reads only current scoped revisions for mutation decisions. */
  async fetchLatestScopedRevisions(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition,
    limit: number = REVISION_SIZE_LIMIT
  ): Promise<StoredKnowledgeIndicator[]> {
    let query = this.fromScopedKnowledgeIndicators(['_id', '_source']);
    query = withWhere(query, where);
    query = pickLatestPerGroup(query, ['stream.name', 'type', 'id']);
    query = withWhere(query, postGroupingWhere);
    query = query.pipe`EVAL _revision_id = _id`
      .keep('_source', '_revision_id')
      .limit(Math.min(limit, REVISION_SIZE_LIMIT));
    const { hits } = await executeAndDecodeSource<StoredKnowledgeIndicator>(this.esClient, query, {
      revisionIdColumn: '_revision_id',
    });
    return hits;
  }

  /** Reads unscoped revisions solely for default-space legacy cleanup. */
  async fetchLatestUnscopedLegacyRevisions(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition,
    limit: number = REVISION_SIZE_LIMIT
  ): Promise<StoredKnowledgeIndicator[]> {
    if (this.space !== DEFAULT_SPACE_ID) {
      return [];
    }
    let query = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], ['_id', '_source']).where`${esql.col(
      'kibana.space_ids'
    )} IS NULL`;
    query = withWhere(query, where);
    query = pickLatestPerGroup(query, ['stream.name', 'type', 'id']);
    query = withWhere(query, postGroupingWhere);
    query = query.pipe`EVAL _revision_id = _id`
      .keep('_source', '_revision_id')
      .limit(Math.min(limit, REVISION_SIZE_LIMIT));

    const { hits } = await executeAndDecodeSource<StoredKnowledgeIndicator>(this.esClient, query, {
      revisionIdColumn: '_revision_id',
    });
    return hits;
  }

  /** Default-space-only enumeration used by Code Intelligence legacy reset. */
  async fetchDistinctUnscopedLegacyStreamNames(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition
  ): Promise<string[]> {
    if (this.space !== DEFAULT_SPACE_ID) {
      return [];
    }
    let query = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], ['_id']).where`${esql.col(
      'kibana.space_ids'
    )} IS NULL`;
    query = withWhere(query, where);
    query = pickLatestPerGroup(query, ['stream.name', 'type', 'id']);
    query = withWhere(query, postGroupingWhere);
    query = query.pipe`STATS __count = COUNT(*) BY streamName = ${esql.col(STREAM_NAME)}`
      .keep('streamName')
      .limit(REVISION_SIZE_LIMIT);

    const response = await runEsqlQuery(this.esClient, query.print('basic'));
    if (!response) return [];
    return esqlToObjects<{ streamName?: unknown }>(response)
      .map((row) => row.streamName)
      .filter((name): name is string => typeof name === 'string');
  }

  async fetchDistinctScopedStreamNames(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition
  ): Promise<string[]> {
    return this.fetchDistinctStreamNamesFromQuery(
      this.fromScopedKnowledgeIndicators(['_id']),
      where,
      postGroupingWhere
    );
  }

  async fetchDistinctStreamNames(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition
  ): Promise<string[]> {
    return this.fetchDistinctStreamNamesFromQuery(
      this.fromKnowledgeIndicators(['_id']),
      where,
      postGroupingWhere,
      true
    );
  }

  private async fetchDistinctStreamNamesFromQuery(
    initialQuery: ReturnType<typeof esql.from>,
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition,
    applyPrecedence = false
  ): Promise<string[]> {
    let query = withWhere(initialQuery, where);
    if (applyPrecedence) query = this.applyDefaultSpacePrecedence(query);
    query = pickLatestPerGroup(query, ['stream.name', 'type', 'id']);
    query = withWhere(query, postGroupingWhere);
    query = query.pipe`STATS __count = COUNT(*) BY streamName = ${esql.col(STREAM_NAME)}`
      .keep('streamName')
      .limit(REVISION_SIZE_LIMIT);

    // `runEsqlQuery` (not `queryEsql`) so a not-yet-created data stream yields
    // `[]` instead of throwing — the sweep can run before any KI is written.
    const response = await runEsqlQuery(this.esClient, query.print('basic'));
    if (!response) {
      return [];
    }

    const rows = esqlToObjects<{ streamName?: unknown }>(response);

    if (rows.length >= REVISION_SIZE_LIMIT) {
      this.logger.warn(
        `Distinct stream enumeration hit REVISION_SIZE_LIMIT (${REVISION_SIZE_LIMIT}); some streams with knowledge indicators may be omitted from this result.`
      );
    }

    return rows
      .map((row) => row.streamName)
      .filter((name): name is string => typeof name === 'string');
  }

  async fetchLatestFeatures(
    stream: string,
    ids: string[]
  ): Promise<StoredFeatureKnowledgeIndicator[]> {
    if (ids.length === 0) return [];
    const where = combineWhere(
      inPredicate(TYPE, [KI_TYPE_FEATURE]),
      inPredicate(STREAM_NAME, [stream]),
      inPredicate(ID, ids)
    );
    const docs = await this.fetchLatestRevisions(where, IS_NOT_DELETED);
    return docs.filter(isStoredFeatureKnowledgeIndicator);
  }
}
