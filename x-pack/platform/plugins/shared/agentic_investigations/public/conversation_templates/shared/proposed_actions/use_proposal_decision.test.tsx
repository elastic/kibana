/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import {
  reportProposalDecided,
  useApproveProposal,
  useDismissProposal,
  useReopenProposal,
} from '@kbn/proposals-plugin/public';
import { useProposalDecision } from './use_proposal_decision';

const analytics = { reportEvent: jest.fn() };

jest.mock('@kbn/proposals-plugin/public', () => {
  // The real reporter, so the test covers the event a decision actually produces.
  const { reportProposalDecided: report } = jest.requireActual(
    '@kbn/proposals-plugin/public/ebt_events'
  );
  return {
    reportProposalDecided: jest.fn(report),
    useApproveProposal: jest.fn(),
    useDismissProposal: jest.fn(),
    useReopenProposal: jest.fn(),
    useIsApprovingProposal: jest.fn(() => false),
    useIsDecliningProposal: jest.fn(() => false),
    useIsReopeningProposal: jest.fn(() => false),
    isDecisionShown: jest.fn(() => false),
  };
});

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { application: { capabilities: {} }, analytics } }),
}));

jest.mock('../../../user_profiles', () => ({
  useCurrentUserProfile: () => ({ data: undefined }),
}));

const proposal = {
  id: 'p1',
  conversationId: 'conv-1',
  origin: 'alertzero',
  category: 'customer label',
  confidence: 'high',
  impact: 'critical',
} as unknown as ProposalWithMetadata;

const mockMutations = (mutateAsync: jest.Mock) => {
  (useApproveProposal as jest.Mock).mockReturnValue({ mutateAsync });
  (useDismissProposal as jest.Mock).mockReturnValue({ mutateAsync });
  (useReopenProposal as jest.Mock).mockReturnValue({ mutateAsync });
};

describe('useProposalDecision telemetry', () => {
  beforeEach(() => {
    analytics.reportEvent.mockClear();
    (reportProposalDecided as jest.Mock).mockClear();
  });

  const setup = () =>
    renderHook(() =>
      useProposalDecision('p1', proposal, { surface: 'hypothesis_tree', investigationId: 'inv-1' })
    ).result;

  it('reports an accepted approve, decline and reopen with the surface and investigation', async () => {
    mockMutations(jest.fn().mockResolvedValue({}));
    const result = setup();

    await act(async () => {
      await result.current.approve(undefined);
      await result.current.dismiss({ dismissReason: 'false_positive', rationale: 'private' });
      await result.current.reopen();
    });

    const base = {
      proposal_id: 'p1',
      surface: 'hypothesis_tree',
      origin: 'alertzero',
      investigation_id: 'inv-1',
      conversation_id: 'conv-1',
      confidence: 'high',
      impact: 'critical',
    };
    expect(analytics.reportEvent.mock.calls).toEqual([
      ['proposal_decided', { ...base, decision: 'approve', dismiss_reason: undefined }],
      ['proposal_decided', { ...base, decision: 'decline', dismiss_reason: 'false_positive' }],
      ['proposal_decided', { ...base, decision: 'reopen', dismiss_reason: undefined }],
    ]);
    expect(JSON.stringify(analytics.reportEvent.mock.calls)).not.toContain('private');
    expect(JSON.stringify(analytics.reportEvent.mock.calls)).not.toContain('customer label');
  });

  it('reports nothing when the server rejects the decision', async () => {
    mockMutations(jest.fn().mockRejectedValue(new Error('409')));
    const result = setup();

    await act(async () => {
      await expect(result.current.approve(undefined)).rejects.toThrow();
      await expect(result.current.dismiss({ dismissReason: 'no_reason' })).rejects.toThrow();
      await expect(result.current.reopen()).rejects.toThrow();
    });

    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });
});
