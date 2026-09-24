/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { ApprovalProposal } from '@kbn/proposals-ui';
import { ProposedActionButton, type ProposedActionButtonProps } from './proposed_action_button';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const mockProposal: ApprovalProposal = {
  comment: 'Isolate the host to cut off the replayed session.',
  impact: 'critical',
  status: 'pending',
  expired: false,
  category: 'Response action',
  action: { name: 'Isolate cfo-mbp-14 — host isolation', reversible: false },
};

const baseProps: ProposedActionButtonProps = {
  proposal: mockProposal,
  onConfirm: jest.fn().mockResolvedValue(undefined),
  onDismiss: jest.fn(),
  'data-test-subj': 'proposedAction',
};

const renderButton = (props: Partial<ProposedActionButtonProps> = {}) =>
  render(<ProposedActionButton {...baseProps} {...props} />, { wrapper });

describe('ProposedActionButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the proposal title, the needs-review badge, and the category/reversibility caption', () => {
    renderButton();
    expect(screen.getByText('Isolate cfo-mbp-14 — host isolation')).toBeInTheDocument();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(screen.getByText('Response action • Irreversible')).toBeInTheDocument();
  });

  it('opens the approval modal on click, matching the one the card recommended-action opens', () => {
    renderButton();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('proposedAction'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Needs review')).toBeInTheDocument();
    expect(
      screen.getAllByText('Isolate cfo-mbp-14 — host isolation').length
    ).toBeGreaterThanOrEqual(2);
  });

  it('commits the approval and shows the modal applying, then applied, without closing it', async () => {
    renderButton();
    fireEvent.click(screen.getByTestId('proposedAction'));

    fireEvent.click(screen.getByTestId('proposedAction-modal-confirm'));

    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(within(screen.getByRole('dialog')).getByText('Applied')).toBeInTheDocument();
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('records the dismissal and closes the modal when Dismiss is clicked', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('proposedAction'));

    fireEvent.click(screen.getByTestId('proposedAction-modal-dismiss'));

    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('omits the modal Dismiss button for a host that cannot record one', () => {
    renderButton({ onDismiss: undefined });
    fireEvent.click(screen.getByTestId('proposedAction'));

    expect(screen.queryByTestId('proposedAction-modal-dismiss')).not.toBeInTheDocument();
  });

  describe('a decided proposal', () => {
    const decidedProposal: ApprovalProposal = {
      ...mockProposal,
      status: 'succeeded',
      decision: 'approved',
      decidedBy: { fullName: 'Bonnie Fishel', username: 'bfishel', email: null },
      decidedAt: '2024-01-01T17:20:00.000Z',
    };

    it('shows an Applied badge and who/when decided it instead of Needs review', () => {
      renderButton({ proposal: decidedProposal });

      expect(screen.getByText('Applied')).toBeInTheDocument();
      expect(screen.queryByText('Needs review')).not.toBeInTheDocument();
      expect(screen.getByText(/Bonnie Fishel/)).toBeInTheDocument();
      expect(screen.queryByText('Response action • Irreversible')).not.toBeInTheDocument();
    });

    it('shows a Declined badge for a dismissed proposal', () => {
      renderButton({ proposal: { ...decidedProposal, decision: 'dismissed' } });

      expect(screen.getByText('Declined')).toBeInTheDocument();
    });

    it('is still clickable, opening a read-only modal for the closed record', () => {
      renderButton({ proposal: decidedProposal });

      fireEvent.click(screen.getByTestId('proposedAction'));

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Applied')).toBeInTheDocument();
      expect(screen.queryByTestId('proposedAction-modal-confirm')).not.toBeInTheDocument();
    });
  });
});
