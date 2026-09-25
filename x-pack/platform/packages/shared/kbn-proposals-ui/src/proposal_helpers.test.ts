/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getProposalCaption,
  getProposalDecision,
  getProposalTone,
  isProposalExpired,
} from './proposal_helpers';
import type { ApprovalProposal } from './types';

const proposal = (overrides: Partial<ApprovalProposal> = {}): ApprovalProposal => ({
  comment: 'Tune the noisy rule',
  impact: 'low',
  status: 'pending',
  expired: false,
  ...overrides,
});

describe('getProposalTone', () => {
  it.each(['high', 'critical'] as const)('is danger for %s impact', (impact) => {
    expect(getProposalTone(proposal({ impact }))).toBe('danger');
  });

  it.each(['low', 'medium'] as const)('is primary for %s impact', (impact) => {
    expect(getProposalTone(proposal({ impact }))).toBe('primary');
  });

  it('shows a revised impact rather than the action metadata it replaced', () => {
    expect(
      getProposalTone(proposal({ impact: 'high', action: { name: 'Isolate host', impact: 'low' } }))
    ).toBe('danger');
  });

  it("falls back to the action's impact when the proposal sets none", () => {
    expect(
      getProposalTone(
        proposal({ impact: undefined, action: { name: 'Isolate host', impact: 'critical' } })
      )
    ).toBe('danger');
  });

  it('is primary when neither the proposal nor its action declares an impact', () => {
    expect(getProposalTone(proposal({ impact: undefined }))).toBe('primary');
  });
});

describe('getProposalCaption', () => {
  it('joins category and reversibility, capitalizing the stored-lowercase category', () => {
    expect(
      getProposalCaption(
        proposal({ category: 'configure', action: { name: 'Isolate host', reversible: true } })
      )
    ).toBe('Configure • Reversible');
  });

  it("prefers the action's own category over the proposal's", () => {
    expect(
      getProposalCaption(
        proposal({
          category: 'configure',
          action: { name: 'Isolate host', category: 'response', reversible: false },
        })
      )
    ).toBe('Response • Irreversible');
  });

  it('omits reversibility when the action declares none', () => {
    expect(getProposalCaption(proposal({ category: 'configure' }))).toBe('Configure');
  });

  it('omits category when neither the proposal nor its action declares one', () => {
    expect(
      getProposalCaption(proposal({ action: { name: 'Isolate host', reversible: true } }))
    ).toBe('Reversible');
  });

  it('is undefined when there is neither a category nor a reversibility flag', () => {
    expect(getProposalCaption(proposal())).toBeUndefined();
  });

  it('omits impact and the deadline by default, even when the proposal carries both', () => {
    expect(
      getProposalCaption(
        proposal({ category: 'configure', impact: 'high', expiresAt: '2999-01-05T17:00:00.000Z' })
      )
    ).toBe('Configure');
  });

  it('appends impact when includeRiskDetails is set', () => {
    expect(
      getProposalCaption(proposal({ category: 'configure', impact: 'high' }), {
        includeRiskDetails: true,
      })
    ).toBe('Configure • High impact');
  });

  it('appends the decision deadline, formatted the same way the host renders any other date', () => {
    const expiresAt = '2999-01-05T17:00:00.000Z';
    const formattedDeadline = new Date(expiresAt).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    expect(
      getProposalCaption(proposal({ category: 'configure', impact: 'high', expiresAt }), {
        includeRiskDetails: true,
      })
    ).toBe(`Configure • High impact • Expires ${formattedDeadline}`);
  });

  it('shows Expired rather than a formatted deadline once the decision window has passed', () => {
    expect(
      getProposalCaption(
        proposal({
          category: 'configure',
          impact: 'high',
          expired: true,
          expiresAt: '2024-01-05T17:00:00.000Z',
        }),
        { includeRiskDetails: true }
      )
    ).toBe('Configure • High impact • Expired');
  });

  it('omits the deadline segment entirely when the proposal carries no expiresAt', () => {
    expect(
      getProposalCaption(proposal({ category: 'configure', impact: 'high' }), {
        includeRiskDetails: true,
      })
    ).toBe('Configure • High impact');
  });
});

describe('getProposalDecision', () => {
  it('is undefined while the proposal is still awaiting a decision', () => {
    expect(getProposalDecision(proposal())).toBeUndefined();
  });

  it('reads a decision as soon as it is present, without requiring decidedBy or decidedAt too', () => {
    // `decision` and `decidedAt` are always written together server-side (see
    // proposals_service.ts), but `decidedBy` can still be genuinely absent — this must not hide
    // a decision that plainly exists.
    expect(
      getProposalDecision(proposal({ decision: 'approved', status: 'succeeded' }))
    ).toMatchObject({ status: 'applied', actorName: 'Someone' });
  });

  it('passes decidedAt through as undefined rather than inventing one when the record has none', () => {
    // A fabricated "now" would read as real audit attribution and would keep changing on every
    // reopen — `ApprovalActorTime` renders the actor alone when `decidedAt` is absent instead.
    const decision = getProposalDecision(
      proposal({
        decision: 'approved',
        status: 'succeeded',
        decidedBy: { fullName: 'Ava', username: 'ava', email: null },
      })
    );
    expect(decision!.decidedAt).toBeUndefined();
  });

  it("prefers the decider's full name, falling back to username", () => {
    expect(
      getProposalDecision(
        proposal({
          decision: 'approved',
          status: 'succeeded',
          decidedBy: { fullName: null, username: 'bfishel', email: null },
          decidedAt: '2024-01-01T17:20:00.000Z',
        })
      )
    ).toMatchObject({ actorName: 'bfishel' });
  });

  it.each([
    ['pending', 'applying'],
    ['executing', 'applying'],
    ['succeeded', 'applied'],
    ['failed', 'failed'],
    ['no_action', 'no_action'],
  ] as const)('maps an approved decision with status %s to %s', (status, expected) => {
    expect(
      getProposalDecision(
        proposal({
          decision: 'approved',
          status,
          decidedBy: { fullName: 'Ava', username: 'ava', email: null },
          decidedAt: '2024-01-01T17:20:00.000Z',
        })
      )
    ).toMatchObject({ status: expected });
  });

  it('reads a dismissal as declined regardless of status', () => {
    expect(
      getProposalDecision(
        proposal({
          decision: 'dismissed',
          status: 'no_action',
          decidedBy: { fullName: 'Ava', username: 'ava', email: null },
          decidedAt: '2024-01-01T17:20:00.000Z',
        })
      )
    ).toMatchObject({ status: 'declined' });
  });
});

describe('isProposalExpired', () => {
  it('is true once the computed deadline flag is set', () => {
    expect(isProposalExpired(proposal({ expired: true }))).toBe(true);
  });

  it('is true for an expiry the workflow settled before the deadline', () => {
    expect(isProposalExpired(proposal({ expired: false, status: 'expired' }))).toBe(true);
  });

  it('is false for a proposal still awaiting a decision', () => {
    expect(isProposalExpired(proposal())).toBe(false);
  });
});
