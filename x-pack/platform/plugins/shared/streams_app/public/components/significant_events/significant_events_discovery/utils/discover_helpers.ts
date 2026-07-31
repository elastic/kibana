/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { TimeState } from '@kbn/es-query';
import type { StreamQuery } from '@kbn/significant-events-schema';
import { conditionToESQLAst, type Condition } from '@kbn/streamlang';

export function buildDiscoverParams(query: StreamQuery, timeState: TimeState) {
  return {
    timeRange: {
      from: timeState.timeRange.from,
      to: timeState.timeRange.to,
    },
    query: {
      esql: query.esql.query,
    },
    interval: 'auto',
  };
}

export function buildFeatureDiscoverParams(
  streamName: string,
  filter: Condition,
  timeState: TimeState
) {
  const query = esql.from(streamName).pipe`WHERE ${conditionToESQLAst(filter)}`;
  query.addSetCommand('unmapped_fields', 'LOAD');

  return {
    timeRange: {
      from: timeState.timeRange.from,
      to: timeState.timeRange.to,
    },
    query: {
      esql: query.print('basic'),
    },
    interval: 'auto',
  };
}
