/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SEVERITIES, SEVERITY_TTL_GROUPS } from '../../common/notification_schema';

/** Longest severity TTL; unknown/future tiers fall back to it so they are never hidden early. */
const MAX_TTL_DAYS = Math.max(...SEVERITY_TTL_GROUPS.keys());

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
  const timestampRange = (days: number): QueryDslQueryContainer => ({
    range: {
      '@timestamp': bound === 'visible' ? { gte: `now-${days}d` } : { lt: `now-${days}d/d` },
    },
  });

  const should: QueryDslQueryContainer[] = [...SEVERITY_TTL_GROUPS.entries()].map(
    ([days, severities]) => ({
      bool: { filter: [{ terms: { severity: severities } }, timestampRange(days)] },
    })
  );

  if (bound === 'visible') {
    should.push({
      bool: {
        must_not: { terms: { severity: [...SEVERITIES] } },
        filter: [timestampRange(MAX_TTL_DAYS)],
      },
    });
  }

  return { bool: { should, minimum_should_match: 1 } };
};
