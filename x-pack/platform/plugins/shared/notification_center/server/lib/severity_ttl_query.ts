/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  MAX_SEVERITY_TTL_DAYS,
  SEVERITIES,
  SEVERITY_TTL_GROUPS,
} from '../../common/notification_schema';

/**
 * The single `@timestamp` boundary for a severity TTL window, as ES date math.
 *
 * Rounding to the start of the day keeps `visible` and `expired` as complements
 * an unrounded read bound would leave docs between `now-Nd/d` and `now-Nd`
 * neither visible nor eligible for cleanup.
 */
export const severityTTLBoundary = (days: number): string => `now-${days}d/d`;

/**
 * Build the severity-TTL windows shared by the read query and the cleanup task, so the two don't drift.
 * `visible` matches docs still inside their severity's retention window.
 * `expired` matches docs past it.
 *
 * Unknown/future severity tiers (written by a newer node) have no defined TTL: the read path keeps
 * them visible for the longest window rather than dropping a possibly-important notification, while
 * cleanup leaves them to the data stream's ILM retention.
 */
export const severityTTLQuery = (bound: 'visible' | 'expired'): QueryDslQueryContainer => {
  const timestampRange = (days: number): QueryDslQueryContainer => {
    const boundary = severityTTLBoundary(days);
    return {
      range: { '@timestamp': bound === 'visible' ? { gte: boundary } : { lt: boundary } },
    };
  };

  const should: QueryDslQueryContainer[] = [...SEVERITY_TTL_GROUPS.entries()].map(
    ([days, severities]) => ({
      bool: { filter: [{ terms: { severity: severities } }, timestampRange(days)] },
    })
  );

  if (bound === 'visible') {
    should.push({
      bool: {
        must_not: { terms: { severity: [...SEVERITIES] } },
        filter: [timestampRange(MAX_SEVERITY_TTL_DAYS)],
      },
    });
  }

  return { bool: { should, minimum_should_match: 1 } };
};
