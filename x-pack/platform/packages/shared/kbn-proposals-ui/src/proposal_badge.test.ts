/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getProposalBadge } from './proposal_badge';
import type { ApprovalProposal } from './types';

const FUTURE = '2026-10-23T12:00:00.000Z';
const PAST = '2026-10-21T12:00:00.000Z';

const pending = {
  title: 'Block IP',
  comment: '',
  impact: 'low',
  status: 'pending',
} as ApprovalProposal;

describe('getProposalBadge', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-22T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('says Needs review for an undecided proposal with no deadline', () => {
    expect(getProposalBadge(pending).label).toBe('Needs review');
  });

  it('says Expires soon, as a warning, while the deadline is still ahead', () => {
    expect(getProposalBadge({ ...pending, expiresAt: FUTURE })).toMatchObject({
      label: 'Expires soon',
      color: 'warning',
    });
  });

  it('goes back to Needs review once the deadline has passed but nothing has settled it yet', () => {
    expect(getProposalBadge({ ...pending, expiresAt: PAST }).label).toBe('Needs review');
  });

  it('puts a missing permission before the deadline', () => {
    expect(getProposalBadge({ ...pending, expiresAt: FUTURE }, { readOnly: true }).label).toBe(
      'Restricted'
    );
  });

  it('puts a retry after a failed attempt before the deadline', () => {
    expect(
      getProposalBadge({ ...pending, expiresAt: FUTURE, previousExecutionError: 'boom' }).label
    ).toBe('Failed');
  });

  it('puts a recorded outcome before the deadline', () => {
    expect(
      getProposalBadge({
        ...pending,
        expiresAt: FUTURE,
        decision: 'approved',
        status: 'succeeded',
      }).label
    ).toBe('Applied');
  });
});
