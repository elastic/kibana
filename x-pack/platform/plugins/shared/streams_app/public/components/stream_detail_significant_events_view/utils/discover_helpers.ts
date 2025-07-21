/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { Streams, getIndexPatternsForStream } from '@kbn/streams-schema';
import { getKqlAsCommandArg } from '@kbn/streams-plugin/common';
import { TimeState } from '@kbn/es-query';
import { SignificantEventItem } from '../../../hooks/use_fetch_significant_events';

export function buildDiscoverParams(
  significantEvent: SignificantEventItem,
  definition: Streams.all.Definition,
  timeState: TimeState
) {
  return {
    timeRange: {
      from: timeState.timeRange.from,
      to: timeState.timeRange.to,
    },
    query: {
      esql: `FROM ${getIndexPatternsForStream(definition).join(
        ','
      )} | WHERE KQL(\"${getKqlAsCommandArg(significantEvent.query.kql.query)}\")`,
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
