/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getProposalCaption, getProposalTone, isProposalExpired } from './proposal_helpers';
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
  it('joins category and reversibility', () => {
    expect(
      getProposalCaption(
        proposal({ category: 'configure', action: { name: 'Isolate host', reversible: true } })
      )
    ).toBe('configure • Reversible');
  });

  it("prefers the action's own category over the proposal's", () => {
    expect(
      getProposalCaption(
        proposal({
          category: 'configure',
          action: { name: 'Isolate host', category: 'response', reversible: false },
        })
      )
    ).toBe('response • Irreversible');
  });

  it('omits reversibility when the action declares none', () => {
    expect(getProposalCaption(proposal({ category: 'configure' }))).toBe('configure');
  });

  it('omits category when neither the proposal nor its action declares one', () => {
    expect(
      getProposalCaption(proposal({ action: { name: 'Isolate host', reversible: true } }))
    ).toBe('Reversible');
  });

  it('is undefined when there is neither a category nor a reversibility flag', () => {
    expect(getProposalCaption(proposal())).toBeUndefined();
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
