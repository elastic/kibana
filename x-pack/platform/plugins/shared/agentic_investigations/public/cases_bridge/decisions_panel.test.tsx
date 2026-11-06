/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { CaseUI } from '@kbn/cases-plugin/common';
import type { CaseDecisionsResponse } from '../../common/cases_bridge';
import { DecisionsPanel } from './decisions_panel';

const RESPONSE: CaseDecisionsResponse = {
  pending: 1,
  can_decide: true,
  decisions: [
    {
      proposal_id: 'p-1',
      title: 'Close 1 alert as true positive',
      comment: 'Approving closes the alert.',
      status: 'pending',
      created_by: { username: 'worker' },
      created_at: '2026-11-06T10:00:00.000Z',
    },
    {
      proposal_id: 'p-0',
      title: 'Isolate the host',
      status: 'succeeded',
      decision: 'approved',
      decided_by: { full_name: 'Dana Whitfield' },
      decided_at: '2026-11-06T09:00:00.000Z',
    },
  ],
};

const renderPanel = ({ decide = true, canUpdate = true } = {}) => {
  const core = coreMock.createStart();
  core.application.capabilities = {
    ...core.application.capabilities,
    proposals: { decideProposals: decide },
  };
  core.http.get.mockResolvedValue(RESPONSE);
  core.http.post.mockResolvedValue({ ...RESPONSE, pending: 0, decisions: [] });
  const refreshCase = jest.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nProvider>
      <KibanaContextProvider services={core}>
        <QueryClientProvider client={queryClient}>
          <DecisionsPanel
            caseData={{ id: 'case-1' } as CaseUI}
            canUpdate={canUpdate}
            refreshCase={refreshCase}
          />
        </QueryClientProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
  return { core, refreshCase };
};

describe('DecisionsPanel', () => {
  it('lists the pending decision with its count and approves it through the case route', async () => {
    const { core, refreshCase } = renderPanel();

    expect(await screen.findByText('Close 1 alert as true positive')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-decisions-pending')).toHaveTextContent(
      '1 decision pending'
    );
    expect(screen.getByTestId('case-view-decisions-decided')).toHaveTextContent('1 decided');

    fireEvent.click(screen.getByTestId('case-view-decision-approve-p-1'));

    await waitFor(() => expect(refreshCase).toHaveBeenCalled());
    expect(core.http.post).toHaveBeenCalledWith(
      '/internal/investigations/investigations/cases/case-1/decisions/p-1',
      expect.objectContaining({ body: JSON.stringify({ decision: 'approve' }) })
    );
    expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith('Proposal approved');
  });

  it('hides Approve and Dismiss without the Proposed actions privilege', async () => {
    renderPanel({ decide: false });

    expect(await screen.findByText('Close 1 alert as true positive')).toBeInTheDocument();
    expect(screen.queryByTestId('case-view-decision-approve-p-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('case-view-decisions-no-privilege')).toBeInTheDocument();
  });

  it('hides them for a reader who cannot update the case', async () => {
    renderPanel({ canUpdate: false });

    expect(await screen.findByText('Close 1 alert as true positive')).toBeInTheDocument();
    expect(screen.queryByTestId('case-view-decision-dismiss-p-1')).not.toBeInTheDocument();
  });
});
