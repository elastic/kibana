/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SEVERITY_TTL_GROUPS } from '../../common/notification_schema';

/**
 * The single `@timestamp` boundary for a severity TTL window, as ES date math.
 *
 * Rounding to the start of the day gives cleanup stable daily boundaries.
 */
export const severityTTLBoundary = (days: number): string => `now-${days}d/d`;

/**
 * Match notification docs that have passed their severity retention window.
 */
export const severityTTLQuery = (): QueryDslQueryContainer => {
  const timestampRange = (days: number): QueryDslQueryContainer => {
    return { range: { '@timestamp': { lt: severityTTLBoundary(days) } } };
  };

  const should: QueryDslQueryContainer[] = [...SEVERITY_TTL_GROUPS.entries()].map(
    ([days, severities]) => ({
      bool: { filter: [{ terms: { severity: severities } }, timestampRange(days)] },
    })
  );

  return { bool: { should, minimum_should_match: 1 } };
};
