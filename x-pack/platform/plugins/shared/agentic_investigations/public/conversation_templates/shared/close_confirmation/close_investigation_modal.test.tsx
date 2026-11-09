/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationClosePreviewResponse } from '../../../../common';
import { CloseInvestigationModal } from './close_investigation_modal';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const preview = (
  overrides: Partial<InvestigationClosePreviewResponse> = {}
): InvestigationClosePreviewResponse => ({
  pending_proposal_count: 0,
  pending_proposals: [],
  running_proposal_count: 0,
  ...overrides,
});

const renderModal = (previewData: InvestigationClosePreviewResponse | undefined) =>
  render(
    <CloseInvestigationModal preview={previewData} onClose={jest.fn()} onConfirm={jest.fn()} />,
    {
      wrapper,
    }
  );

const CALLOUT = 'closeInvestigationRunningActionsCallout';

describe('CloseInvestigationModal: running actions', () => {
  it('warns that one running action will finish on its own', () => {
    renderModal(preview({ running_proposal_count: 1 }));

    expect(screen.getByTestId(CALLOUT)).toHaveTextContent(
      '1 action is still running and will finish on its own.'
    );
  });

  it('uses the plural form for several running actions', () => {
    renderModal(preview({ running_proposal_count: 3 }));

    expect(screen.getByTestId(CALLOUT)).toHaveTextContent(
      '3 actions are still running and will finish on their own.'
    );
  });

  it('shows the warning together with the pending proposals', () => {
    renderModal(
      preview({
        pending_proposal_count: 1,
        pending_proposals: [{ id: 'p-1', action_name: 'Block IP' }],
        running_proposal_count: 2,
      })
    );

    expect(screen.getByTestId('closeInvestigationProposalsList')).toBeInTheDocument();
    expect(screen.getByTestId(CALLOUT)).toBeInTheDocument();
  });

  it('shows no warning when no action is running', () => {
    renderModal(
      preview({ pending_proposal_count: 1, pending_proposals: [{ id: 'p-1', action_name: null }] })
    );

    expect(screen.queryByTestId(CALLOUT)).not.toBeInTheDocument();
  });

  it('shows no warning while the preview is loading', () => {
    renderModal(undefined);

    expect(screen.queryByTestId(CALLOUT)).not.toBeInTheDocument();
  });
});
