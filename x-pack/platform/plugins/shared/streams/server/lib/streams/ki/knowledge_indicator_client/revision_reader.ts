/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerSortShorthand } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  KNOWLEDGE_INDICATORS_DATA_STREAM,
  isStoredFeatureKnowledgeIndicator,
  type StoredFeatureKnowledgeIndicator,
  type StoredKnowledgeIndicator,
} from '../data_stream';
import { combineWhere, inPredicate, IS_NOT_DELETED } from '../esql_helpers';
import {
  executeAndDecodeSource,
  latestSourceFrom,
  pickLatestPerGroup,
  withSort,
  withWhere,
  type LatestSourceWhereCondition,
} from '../../../sig_events/latest_source_query';
import { ID, KI_TYPE_FEATURE, STREAM_NAME, TYPE } from '../fields';

export class RevisionReader {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly space: string
  ) {}

  async fetchLatestRevisions(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition,
    sort?: ComposerSortShorthand[]
  ): Promise<StoredKnowledgeIndicator[]> {
    let query = latestSourceFrom(KNOWLEDGE_INDICATORS_DATA_STREAM, this.space);
    query = withWhere(query, where);
    query = pickLatestPerGroup(query, ['stream.name', 'type', 'id']);
    query = withWhere(query, postGroupingWhere);
    query = withSort(query, sort);
    query = query.keep('_source');

    const { hits } = await executeAndDecodeSource<StoredKnowledgeIndicator>(
      this.esClient,
      query
    );
    return hits;
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
