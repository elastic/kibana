/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { omit } from 'lodash';
import type { Condition } from '@kbn/streamlang';
import type { Query } from '../../../../common/queries';

export interface QueryData {
  title: string;
  kql: string;
  feature?: {
    name: string;
    filter: Condition;
  };
  currentCount: number;
  sampleEvents: string[];
}

const SAMPLE_EVENTS_COUNT = 5;

export async function collectQueryData({
  query,
  esClient,
  from,
  to,
}: {
  query: Query;
  esClient: ElasticsearchClient;
  /** Start of the time range to filter the query (ISO 8601). */
  from: string;
  /** End of the time range to filter the query (ISO 8601). */
  to: string;
}): Promise<QueryData> {
  const { rule_id: ruleId } = query;

  const currentResponse = await esClient.search<{ original_source: Record<string, unknown> }>({
    index: '.alerts-streams.alerts-default',
    size: SAMPLE_EVENTS_COUNT,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
          {
            term: {
              'kibana.alert.rule.uuid': ruleId,
            },
          },
        ],
      },
    },
    track_total_hits: true,
  });

  const currentCount =
    typeof currentResponse.hits.total === 'number'
      ? currentResponse.hits.total
      : currentResponse.hits.total?.value ?? 0;

  const sampleEvents = currentResponse.hits.hits.map((hit) =>
    JSON.stringify(omit(hit._source?.original_source ?? {}, '_id'))
  );

  return {
    title: query.query.title,
    kql: query.query.kql.query,
    feature: query.query.feature
      ? { name: query.query.feature.name, filter: query.query.feature.filter }
      : undefined,
    currentCount,
    sampleEvents,
  };
}
