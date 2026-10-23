/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  useApproveProposal,
  useDismissProposal,
  useIsApprovingProposal,
  useIsDecliningProposal,
  useIsReopeningProposal,
  useReopenProposal,
  useProposal,
} from '@kbn/proposals-plugin/public';
import { useCurrentUserProfile } from '../../user_profiles';
import { investigationQueryKeys } from '../../investigations/query_keys';
import { ProposalDecision } from './proposal_decision';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('@kbn/proposals-plugin/public');
jest.mock('../../user_profiles');

const approve = jest.fn();
const dismiss = jest.fn();
const reopen = jest.fn();

const proposal = {
  id: 'p-1',
  title: 'Roll back edge-proxy',
  comment: 'Restores the keep-alive timeout.',
  status: 'pending',
  confidence: 'high',
  impact: 'low',
  actionInput: { revision: 3 },
  createdAt: '2026-07-28T14:00:00.000Z',
};

const setup = ({
  canDecide = true,
  isMissing = false,
  data = proposal as Record<string, unknown>,
} = {}) => {
  (useKibana as jest.Mock).mockReturnValue({
    services: { application: { capabilities: { proposals: { decideProposals: canDecide } } } },
  });
  (useProposal as jest.Mock).mockReturnValue({
    data: isMissing ? undefined : data,
    isLoading: false,
  });
  (useApproveProposal as jest.Mock).mockReturnValue({ mutateAsync: approve });
  (useDismissProposal as jest.Mock).mockReturnValue({ mutateAsync: dismiss });
  (useIsApprovingProposal as jest.Mock).mockReturnValue(false);
  (useIsDecliningProposal as jest.Mock).mockReturnValue(false);
  (useReopenProposal as jest.Mock).mockReturnValue({ mutateAsync: reopen });
  (useIsReopeningProposal as jest.Mock).mockReturnValue(false);
  (useCurrentUserProfile as jest.Mock).mockReturnValue({ data: undefined });
  const queryClient = new QueryClient();
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  render(
    <EuiProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <ProposalDecision investigationId="conv-1" proposalId="p-1" />
        </QueryClientProvider>
      </I18nProvider>
    </EuiProvider>
  );
  return { invalidate };
};

describe('ProposalDecision', () => {
  beforeEach(() => jest.clearAllMocks());

  it('approves with the action input and reads the investigation again', async () => {
    approve.mockResolvedValue({});
    const { invalidate } = setup();

    fireEvent.click(screen.getByTestId('investigationHypothesisTreeProposal-p-1-confirm'));

    await waitFor(() =>
      expect(approve).toHaveBeenCalledWith({ id: 'p-1', body: { actionInput: { revision: 3 } } })
    );
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: investigationQueryKeys.detail('conv-1'),
      })
    );
  });

  it('offers a decline', () => {
    setup();

    expect(screen.getByTestId('investigationHypothesisTreeProposal-p-1-dismiss')).toBeEnabled();
  });

  it("offers only I've applied for a to-do proposal", () => {
    setup({ data: { ...proposal, category: 'todo' } });

    expect(screen.getByTestId('investigationHypothesisTreeProposal-p-1-confirm')).toHaveTextContent(
      "I've applied"
    );
    expect(
      screen.queryByTestId('investigationHypothesisTreeProposal-p-1-dismiss')
    ).not.toBeInTheDocument();
  });

  it('marks a to-do proposal marked as applied as not applied, and reads the investigation again', async () => {
    const { invalidate } = setup({
      data: { ...proposal, category: 'todo', decision: 'approved', status: 'no_action' },
    });

    fireEvent.click(screen.getByTestId('investigationHypothesisTreeProposal-p-1-reopen'));

    await waitFor(() => expect(reopen).toHaveBeenCalledWith({ id: 'p-1' }));
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
  });

  it('disables the decision without the decide capability', () => {
    setup({ canDecide: false });

    expect(screen.getByTestId('investigationHypothesisTreeProposal-p-1-confirm')).toBeDisabled();
  });

  it('says so when the proposal cannot be read', () => {
    setup({ isMissing: true });

    expect(screen.getByText(/Unable to load proposed actions/)).toBeInTheDocument();
  });
});
