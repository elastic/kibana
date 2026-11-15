/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ConnectedStatusToggle } from './connected_status_toggle';
import { statusSignal } from './status_signal';

const mockSettleDeclinedProposals = jest.fn();
const mockSetInvestigationStatus = jest.fn();
const mockAddSuccess = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { notifications: { toasts: { addSuccess: mockAddSuccess } } } }),
}));

jest.mock('@kbn/agentic-investigations-common', () => ({
  StatusToggle: ({ onChange }: { onChange: (status: 'open' | 'closed') => void }) => (
    <button onClick={() => onChange('closed')}>toggle</button>
  ),
}));

jest.mock('@kbn/proposals-plugin/public', () => ({
  queryKeys: { proposals: { all: ['proposals'] } },
}));

jest.mock('../../../investigations/hooks/use_investigations_api', () => ({
  useSetInvestigationStatus: () => ({ mutate: mockSetInvestigationStatus, isLoading: false }),
  useInvestigationClosePreview: () => ({
    data: { pending_proposal_count: 1, pending_proposals: [{ id: 'p-1', action_name: 'a' }] },
    isFetching: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../../../escalations/hooks/use_escalations_api', () => ({
  useSetEscalationStatus: () => ({ mutate: jest.fn(), isLoading: false }),
  useEscalationClosePreview: () => ({ data: undefined, refetch: jest.fn() }),
}));

jest.mock('../../../investigations/hooks/use_can_manage_investigations', () => ({
  useCanManageInvestigations: () => true,
}));

jest.mock('../../../escalations/hooks/use_escalation_privileges', () => ({
  useCanManageEscalations: () => true,
}));

jest.mock('./use_settle_declined_proposals', () => ({
  useSettleDeclinedProposals: () => mockSettleDeclinedProposals,
}));

jest.mock('../close_confirmation/close_investigation_modal', () => ({
  CloseInvestigationModal: ({ onConfirm }: { onConfirm: (params: object) => void }) => (
    <button onClick={() => onConfirm({ dismissReason: 'no_reason' })}>confirm close</button>
  ),
}));

const closeInvestigation = (dismissedProposalIds: string[]) => {
  mockSetInvestigationStatus.mockImplementation((_vars, { onSuccess }) =>
    onSuccess({ failed_proposal_ids: [], dismissed_proposal_ids: dismissedProposalIds })
  );

  const queryClient = new QueryClient();
  const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <ConnectedStatusToggle
        conversationId="conv-1"
        templateId="investigation"
        status="open"
        refetchConversation={jest.fn()}
      />
    </QueryClientProvider>
  );

  fireEvent.click(screen.getByText('toggle'));
  fireEvent.click(screen.getByText('confirm close'));

  return { invalidateQueries };
};

describe('ConnectedStatusToggle closing an investigation', () => {
  let bump: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    bump = jest.spyOn(statusSignal, 'bump');
  });

  afterEach(() => {
    bump.mockRestore();
  });

  it('hands the dismissed proposals to the settle hook and defers the proposals refresh', () => {
    const { invalidateQueries } = closeInvestigation(['p-1', 'p-2']);

    expect(mockSettleDeclinedProposals).toHaveBeenCalledWith(['p-1', 'p-2']);
    // An early proposals refetch would read them as pending and drop the `Declining` state.
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['proposals'] });
    expect(bump).not.toHaveBeenCalled();
    expect(mockAddSuccess).toHaveBeenCalledTimes(1);
  });

  it('refreshes proposals straight away when the close dismissed none', () => {
    const { invalidateQueries } = closeInvestigation([]);

    expect(mockSettleDeclinedProposals).not.toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['proposals'] });
    expect(bump).toHaveBeenCalledTimes(1);
  });
});
