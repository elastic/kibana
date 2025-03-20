/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignificantEventsResponse } from '@kbn/streams-schema';
import { v4 } from 'uuid';

export function buildDiscoverParams(significantEvent: SignificantEventsResponse, name?: string) {
  return {
    timeRange: {
      from: 'now-7d',
      to: 'now',
    },
    query: {
      query: significantEvent.kql.query,
      language: 'kuery',
    },
    dataViewSpec: {
      id: v4(),
      title: name,
      timeFieldName: '@timestamp',
    },
  };
}
