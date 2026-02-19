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
import { getRuleIdFromQueryLink } from '../../streams/assets/query/helpers/query';
import { parseError } from '../../streams/errors/parse_error';
import { SecurityError } from '../../streams/errors/security_error';

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
const CURRENT_WINDOW_MINUTES = 15;

export async function collectQueryData({
  query,
  esClient,
}: {
  query: Query;
  esClient: ElasticsearchClient;
}): Promise<QueryData | undefined> {
  const ruleId = getRuleIdFromQueryLink(query);

  const currentResponse = await esClient
    .search<{ original_source: Record<string, unknown> }>({
      index: '.alerts-streams.alerts-default',
      size: SAMPLE_EVENTS_COUNT,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: `now-${CURRENT_WINDOW_MINUTES}m`,
                  lte: 'now',
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
    })
    .catch((err) => {
      const { type, message } = parseError(err);
      if (type === 'security_exception') {
        throw new SecurityError(
          `Cannot read Significant events, insufficient privileges: ${message}`,
          { cause: err }
        );
      }
      throw err;
    });

  const currentCount =
    typeof currentResponse.hits.total === 'number'
      ? currentResponse.hits.total
      : currentResponse.hits.total?.value ?? 0;

  if (currentCount === 0) {
    return undefined;
  }

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
