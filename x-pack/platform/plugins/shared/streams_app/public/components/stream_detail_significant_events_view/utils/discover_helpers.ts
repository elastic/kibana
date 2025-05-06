/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { SignificantEventItem } from '../../../hooks/use_fetch_significant_events';

export function buildDiscoverParams(significantEvent: SignificantEventItem, name?: string) {
  return {
    timeRange: {
      from: 'now-7d',
      to: 'now',
    },
    query: {
      query: significantEvent.query.kql.query,
      language: 'kuery',
    },
    dataViewSpec: {
      id: v4(),
      title: name,
      timeFieldName: '@timestamp',
    },
  };
}
