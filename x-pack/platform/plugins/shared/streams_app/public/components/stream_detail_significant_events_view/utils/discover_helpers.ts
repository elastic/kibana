/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, getIndexPatternsForStream, type StreamQueryKql } from '@kbn/streams-schema';
import { v4 } from 'uuid';

export function buildDiscoverParams(query: StreamQueryKql, definition: Streams.all.Definition) {
  return {
    timeRange: {
      from: 'now-7d',
      to: 'now',
    },
    query: {
      query: query.kql.query,
      language: 'kuery',
    },
    dataViewSpec: {
      id: v4(),
      title: getIndexPatternsForStream(definition).join(','),
      timeFieldName: '@timestamp',
    },
  };
}
