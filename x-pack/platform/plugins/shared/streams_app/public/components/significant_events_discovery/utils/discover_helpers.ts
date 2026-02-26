/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeState } from '@kbn/es-query';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import { getIndexPatternsForStream } from '@kbn/streams-schema';
import { v4 } from 'uuid';

export function buildDiscoverParams(
  query: StreamQuery,
  definition: Streams.all.Definition,
  timeState: TimeState
) {
  return {
    timeRange: {
      from: timeState.timeRange.from,
      to: timeState.timeRange.to,
    },
    query: {
      esql: query.esql.query,
    },
    dataViewSpec: {
      id: v4(),
      title: getIndexPatternsForStream(definition).join(','),
      name: definition.name,
      timeFieldName: '@timestamp',
      type: 'esql',
    },
    filters: [],
    interval: 'auto',
  };
}
