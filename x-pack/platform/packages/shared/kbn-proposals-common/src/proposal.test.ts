/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_CHARTS_SUMMARY_BUCKETS } from './constants';
import {
  isProposalSettling,
  isTerminal,
  OPEN_PROPOSAL_STATUSES,
  proposalChartsSummaryQuerySchema,
  proposalStatusSchema,
  SETTLED_PROPOSAL_STATUSES,
} from './proposal';
import { reviseProposalResponseSchema } from './revision';

describe('proposalChartsSummaryQuerySchema', () => {
  it('should default to a 24h window at 30 minute granularity', () => {
    expect(proposalChartsSummaryQuerySchema.parse({})).toEqual({
      windowHours: 24,
      bucketMinutes: 30,
    });
  });

  it('should coerce the query string values a route hands it', () => {
    expect(
      proposalChartsSummaryQuerySchema.parse({ windowHours: '6', bucketMinutes: '15' })
    ).toEqual({ windowHours: 6, bucketMinutes: 15 });
  });

  /**
   * Each bound is individually valid; together they resolve to ~2 000 buckets,
   * which crosses the ES|QL result ceiling. Truncation drops the tail of the
   * sort — the most recent buckets — without erroring, so rejecting the request
   * is the only honest answer.
   */
  it('should reject a window and granularity that exceed the bucket ceiling', () => {
    const result = proposalChartsSummaryQuerySchema.safeParse({
      windowHours: 168,
      bucketMinutes: 5,
    });

    expect(result.success).toBe(false);
  });

  it('should accept the widest window at a granularity that stays under the ceiling', () => {
    const windowHours = 168;
    const bucketMinutes = 15;
    expect((windowHours * 60) / bucketMinutes).toBeLessThanOrEqual(MAX_CHARTS_SUMMARY_BUCKETS);

    expect(proposalChartsSummaryQuerySchema.safeParse({ windowHours, bucketMinutes }).success).toBe(
      true
    );
  });
});

describe('isProposalSettling', () => {
  it('reads true for an approved proposal whose action has not finished running yet', () => {
    expect(isProposalSettling({ decision: 'approved', status: 'executing' })).toBe(true);
  });

  it('reads true for an approved proposal still pending while the gate workflow catches up', () => {
    expect(isProposalSettling({ decision: 'approved', status: 'pending' })).toBe(true);
  });

  it('reads false once the action has reached a terminal status', () => {
    expect(isProposalSettling({ decision: 'approved', status: 'succeeded' })).toBe(false);
    expect(isProposalSettling({ decision: 'approved', status: 'failed' })).toBe(false);
  });

  it('reads false for a dismissed proposal, which has no action to run', () => {
    expect(isProposalSettling({ decision: 'dismissed', status: 'pending' })).toBe(false);
    expect(isProposalSettling({ decision: 'dismissed', status: 'no_action' })).toBe(false);
  });

  it('reads false for a proposal nobody has decided yet', () => {
    expect(isProposalSettling({ decision: undefined, status: 'pending' })).toBe(false);
  });
});

describe('isTerminal', () => {
  it.each(['succeeded', 'failed', 'expired', 'no_action', 'superseded'] as const)(
    'treats %s as settled',
    (status) => {
      expect(isTerminal(status)).toBe(true);
    }
  );

  it.each(['pending', 'executing'] as const)('treats %s as still open', (status) => {
    expect(isTerminal(status)).toBe(false);
  });
});

describe('proposal status groups', () => {
  it('lists the open and settled statuses', () => {
    expect(OPEN_PROPOSAL_STATUSES).toEqual(['pending', 'executing']);
    expect(SETTLED_PROPOSAL_STATUSES).toEqual(['succeeded', 'failed', 'expired', 'no_action']);
  });

  it('never puts a status in both groups', () => {
    expect(OPEN_PROPOSAL_STATUSES.filter((s) => SETTLED_PROPOSAL_STATUSES.includes(s))).toEqual([]);
  });

  it('keeps `superseded` out of both groups because its successor represents it', () => {
    expect([...OPEN_PROPOSAL_STATUSES, ...SETTLED_PROPOSAL_STATUSES]).not.toContain('superseded');
  });

  it.each(proposalStatusSchema.options)(
    'agrees with isTerminal about %s: terminal unless open',
    (status) => {
      expect(isTerminal(status)).toBe(!OPEN_PROPOSAL_STATUSES.includes(status));
    }
  );
});

describe('reviseProposalResponseSchema', () => {
  /**
   * The route and the Agent Builder tool both build this response by hand, so a
   * plain `z.string()` here would let either drift to a status the rest of the
   * system does not know about while the schema still reports a valid response.
   */
  it('should reject a status outside the proposal vocabulary', () => {
    const result = reviseProposalResponseSchema.safeParse({
      proposalId: 'proposal-1',
      revision: 2,
      status: 'revised',
    });

    expect(result.success).toBe(false);
  });

  it('should accept a status the proposal vocabulary defines', () => {
    expect(
      reviseProposalResponseSchema.parse({
        proposalId: 'proposal-1',
        revision: 2,
        status: 'pending',
      })
    ).toEqual({ proposalId: 'proposal-1', revision: 2, status: 'pending' });
  });
});
