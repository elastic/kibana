/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeState } from '@kbn/es-query';
import { Streams, getIndexPatternsForStream, buildEsqlQuery } from '@kbn/streams-schema';
import { v4 } from 'uuid';
import { SignificantEventItem } from '../../../hooks/use_fetch_significant_events';

export function buildDiscoverParams(
  significantEvent: SignificantEventItem,
  definition: Streams.all.Definition,
  timeState: TimeState
) {
  const esqlQuery = buildEsqlQuery(getIndexPatternsForStream(definition), significantEvent.query);

  return {
    timeRange: {
      from: timeState.timeRange.from,
      to: timeState.timeRange.to,
    },
    query: {
      esql: esqlQuery,
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
