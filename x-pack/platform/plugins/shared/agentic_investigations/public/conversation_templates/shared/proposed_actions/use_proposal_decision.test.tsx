/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import { addProposalDecidedListener } from '@kbn/proposals-plugin/public';
import {
  useApproveProposal,
  useDismissProposal,
  useReopenProposal,
} from '@kbn/proposals-plugin/public';
import { useProposalDecision } from './use_proposal_decision';

jest.mock('@kbn/proposals-plugin/public', () => {
  // The real registry, so the test covers what a listener actually receives.
  const { addProposalDecidedListener: add, notifyProposalDecided } = jest.requireActual(
    '@kbn/proposals-plugin/public/proposal_decision_listeners'
  );
  return {
    addProposalDecidedListener: add,
    notifyProposalDecided,
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
  useKibana: () => ({ services: { application: { capabilities: {} } } }),
}));

jest.mock('../../../user_profiles', () => ({
  useCurrentUserProfile: () => ({ data: undefined }),
}));

const proposal = {
  id: 'p1',
  conversationId: 'conv-1',
  origin: 'nightshift',
  category: 'Response action',
  confidence: 'high',
  impact: 'critical',
} as unknown as ProposalWithMetadata;

const mockMutations = (mutateAsync: jest.Mock) => {
  (useApproveProposal as jest.Mock).mockReturnValue({ mutateAsync });
  (useDismissProposal as jest.Mock).mockReturnValue({ mutateAsync });
  (useReopenProposal as jest.Mock).mockReturnValue({ mutateAsync });
};

describe('useProposalDecision notifications', () => {
  const listener = jest.fn();
  let unsubscribe: () => void;

  beforeEach(() => {
    listener.mockClear();
    unsubscribe = addProposalDecidedListener(listener);
  });
  afterEach(() => unsubscribe());

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
      proposalId: 'p1',
      surface: 'hypothesis_tree',
      investigationId: 'inv-1',
      conversationId: 'conv-1',
      origin: 'nightshift',
      category: 'Response action',
      confidence: 'high',
      impact: 'critical',
    };
    expect(listener.mock.calls.map(([event]) => event)).toEqual([
      { ...base, decision: 'approve' },
      { ...base, decision: 'decline', dismissReason: 'false_positive' },
      { ...base, decision: 'reopen' },
    ]);
    expect(JSON.stringify(listener.mock.calls)).not.toContain('private');
  });

  it('reports nothing when the server rejects the decision', async () => {
    mockMutations(jest.fn().mockRejectedValue(new Error('409')));
    const result = setup();

    await act(async () => {
      await expect(result.current.approve(undefined)).rejects.toThrow();
      await expect(result.current.dismiss({ dismissReason: 'no_reason' })).rejects.toThrow();
      await expect(result.current.reopen()).rejects.toThrow();
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
