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
import {
  INVESTIGATION_CASE_ATTACHMENT_TYPE,
  type CaseDecisionsResponse,
} from '../../common/cases_bridge';
import { DecisionsNotice, DecisionsTab } from './decisions_tab';

const PENDING: CaseDecisionsResponse = {
  pending: 1,
  decided: 41,
  total: 1,
  can_decide: true,
  decisions: [
    {
      proposal_id: 'p-1',
      title: 'Close 1 alert as true positive',
      comment: 'Approving closes the alert.\nSecond line.',
      category: 'investigate',
      investigation_id: 'inv-1',
      status: 'pending',
      created_by: { username: 'worker' },
      created_at: '2026-11-06T10:00:00.000Z',
    },
  ],
};

const CASE = {
  id: 'case-1',
  pendingDecisions: 1,
  comments: [
    {
      type: INVESTIGATION_CASE_ATTACHMENT_TYPE,
      attachmentId: 'inv-1',
      metadata: { title: 'LSASS dump on fin-ws-07' },
    },
  ],
} as unknown as CaseUI;

const renderTab = ({ decide = true, canUpdate = true, caseData = CASE } = {}) => {
  const core = coreMock.createStart();
  core.application.capabilities = {
    ...core.application.capabilities,
    proposals: { decideProposals: decide },
  };
  core.http.get.mockResolvedValue(PENDING);
  core.http.post.mockResolvedValue({ ...PENDING, pending: 0, decisions: [] });
  const refreshCase = jest.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nProvider>
      <KibanaContextProvider services={core}>
        <QueryClientProvider client={queryClient}>
          <DecisionsTab caseData={caseData} canUpdate={canUpdate} refreshCase={refreshCase} />
        </QueryClientProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
  return { core, refreshCase };
};

describe('DecisionsTab', () => {
  it('pages the pending decisions and approves one through the case route', async () => {
    const { core, refreshCase } = renderTab();

    expect(await screen.findByText('Close 1 alert as true positive')).toBeInTheDocument();
    expect(screen.getByText('LSASS dump on fin-ws-07')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-decisions-pending')).toHaveTextContent('Pending (1)');
    expect(screen.getByTestId('case-view-decisions-decided')).toHaveTextContent('Decided (41)');
    expect(core.http.get).toHaveBeenCalledWith(
      '/internal/investigations/investigations/cases/case-1/decisions',
      expect.objectContaining({ query: { status: 'pending', page: 1, per_page: 20 } })
    );

    fireEvent.click(screen.getByTestId('case-view-decision-approve-p-1'));

    await waitFor(() => expect(refreshCase).toHaveBeenCalled());
    expect(core.http.post).toHaveBeenCalledWith(
      '/internal/investigations/investigations/cases/case-1/decisions/p-1',
      expect.objectContaining({ body: JSON.stringify({ decision: 'approve' }) })
    );
    expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith('Proposal approved');
  });

  it('searches by title from the first page', async () => {
    const { core } = renderTab();
    await screen.findByText('Close 1 alert as true positive');

    const search = screen.getByTestId('case-view-decisions-search');
    fireEvent.change(search, { target: { value: 'isolate' } });
    fireEvent.keyUp(search, { key: 'Enter' });

    await waitFor(() =>
      expect(core.http.get).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ query: expect.objectContaining({ search: 'isolate', page: 1 }) })
      )
    );
  });

  it('shows the full comment only when the row is expanded', async () => {
    renderTab();
    await screen.findByText('Close 1 alert as true positive');
    expect(screen.queryByText('Second line.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('case-view-decision-expand-p-1'));

    expect(await screen.findByText(/Second line\./)).toBeInTheDocument();
  });

  it('hides Approve and Dismiss without the Proposed actions privilege, and says why', async () => {
    renderTab({ decide: false });

    expect(await screen.findByText('Close 1 alert as true positive')).toBeInTheDocument();
    expect(screen.queryByTestId('case-view-decision-approve-p-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('case-view-decisions-no-privilege')).toBeInTheDocument();
  });

  it('hides them for a reader who cannot update the case', async () => {
    renderTab({ canUpdate: false });

    expect(await screen.findByText('Close 1 alert as true positive')).toBeInTheDocument();
    expect(screen.queryByTestId('case-view-decision-dismiss-p-1')).not.toBeInTheDocument();
  });
});

describe('DecisionsNotice', () => {
  it('says how many wait and opens the Decisions tab', () => {
    const openTab = jest.fn();
    render(
      <I18nProvider>
        <DecisionsNotice
          caseData={{ ...CASE, pendingDecisions: 3 } as CaseUI}
          canUpdate
          refreshCase={jest.fn()}
          openTab={openTab}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('case-view-decisions-notice')).toHaveTextContent(
      '3 decisions waiting'
    );
    fireEvent.click(screen.getByTestId('case-view-decisions-review'));
    expect(openTab).toHaveBeenCalledWith('decisions');
  });

  it('renders nothing when nothing waits', () => {
    const { container } = render(
      <I18nProvider>
        <DecisionsNotice
          caseData={{ ...CASE, pendingDecisions: 0 } as CaseUI}
          canUpdate
          refreshCase={jest.fn()}
        />
      </I18nProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
