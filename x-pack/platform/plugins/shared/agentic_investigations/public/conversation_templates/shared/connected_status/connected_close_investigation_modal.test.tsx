/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { Investigation } from '@kbn/agentic-investigations-common';
import { ConnectedCloseInvestigationModal } from './connected_close_investigation_modal';

const mockSettleDeclinedProposals = jest.fn();
const mockUseSettleDeclinedProposals = jest.fn(() => mockSettleDeclinedProposals);
const mockMutateAsync = jest.fn();
const mockAddSuccess = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: { notifications: { toasts: { addSuccess: mockAddSuccess, addWarning: jest.fn() } } },
  }),
}));

jest.mock('@kbn/proposals-plugin/public', () => ({
  queryKeys: { proposals: { all: ['proposals'] } },
}));

jest.mock('../../../investigations/hooks/use_investigations_api', () => ({
  useSetInvestigationStatus: () => ({ mutateAsync: mockMutateAsync, isLoading: false }),
  useInvestigationClosePreview: () => ({
    data: { pending_proposal_count: 1, pending_proposals: [{ id: 'p-1', action_name: 'a' }] },
    isFetching: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('./use_settle_declined_proposals', () => ({
  useSettleDeclinedProposals: (...args: unknown[]) =>
    mockUseSettleDeclinedProposals(...(args as [])),
}));

jest.mock('../close_confirmation/close_investigation_modal', () => ({
  CloseInvestigationModal: ({ onConfirm }: { onConfirm: (params: object) => void }) => (
    <button onClick={() => onConfirm({ dismissReason: 'no_reason' })}>confirm close</button>
  ),
}));

const investigation = { id: 'conv-1', conversationId: 'conv-1' } as Investigation;

describe('ConnectedCloseInvestigationModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('settles the dismissed proposals, with the host’s drop callback, and closes the modal', async () => {
    mockMutateAsync.mockResolvedValue({
      failed_proposal_ids: [],
      dismissed_proposal_ids: ['p-1'],
    });
    const onClose = jest.fn();
    const dropDecidedProposal = jest.fn();
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <ConnectedCloseInvestigationModal
          investigation={investigation}
          onClose={onClose}
          dropDecidedProposal={dropDecidedProposal}
        />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByText('confirm close'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockUseSettleDeclinedProposals).toHaveBeenCalledWith(dropDecidedProposal);
    expect(mockSettleDeclinedProposals).toHaveBeenCalledWith(['p-1']);
    expect(mockAddSuccess).toHaveBeenCalledTimes(1);
    // Proposals are refreshed by the settle hook once the decisions land, not here.
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['proposals'] });
  });

  it('keeps the modal open and settles nothing when the close is rejected', async () => {
    mockMutateAsync.mockRejectedValue(
      Object.assign(new Error('Conflict'), {
        request: {},
        response: { status: 409 },
        body: { attributes: { code: 'close_targets_changed' } },
      })
    );
    const onClose = jest.fn();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConnectedCloseInvestigationModal investigation={investigation} onClose={onClose} />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByText('confirm close'));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockSettleDeclinedProposals).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
