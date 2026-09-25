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
import {
  ProposedActionButton,
  type DismissProposalParams,
  type ProposedActionButtonProps,
} from './proposed_action_button';

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

/**
 * Stands in for a host's real dismiss-reason modal (e.g. `DismissProposalModal`): a button that
 * calls `onConfirm` with a fixed reason/rationale, so a test can drive the row's own "Declining"
 * lifecycle without depending on a host-specific form.
 */
const FakeDismissModal: React.FC<{
  onClose: () => void;
  onConfirm: (params: DismissProposalParams) => Promise<void>;
}> = ({ onClose, onConfirm }) => (
  <div role="dialog" aria-label="Fake dismiss modal">
    <button onClick={onClose}>Cancel</button>
    <button onClick={() => onConfirm({ dismissReason: 'wrong', rationale: 'Not needed.' })}>
      Confirm dismiss
    </button>
  </div>
);

const baseProps: ProposedActionButtonProps = {
  proposal: mockProposal,
  onConfirm: jest.fn().mockResolvedValue(undefined),
  onDismiss: jest.fn().mockResolvedValue(undefined),
  renderDismissModal: ({ onClose, onConfirm }) => (
    <FakeDismissModal onClose={onClose} onConfirm={onConfirm} />
  ),
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

  it('names the row with its own title and status, not a fixed string every row shares', () => {
    renderButton();
    expect(
      screen.getByRole('button', {
        name: 'Review proposed action: Isolate cfo-mbp-14 — host isolation, Needs review',
      })
    ).toBeInTheDocument();
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

  it('commits the approval by calling onConfirm from the modal', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('proposedAction'));

    fireEvent.click(screen.getByTestId('proposedAction-modal-confirm'));

    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows Applying on the row and in the modal when isSubmitting is set, hiding the actions', () => {
    renderButton({ isSubmitting: 'applying' });
    fireEvent.click(screen.getByTestId('proposedAction'));

    // The row badge, not just the modal's own header badge — both say "Applying".
    const row = screen.getByTestId('proposedAction');
    expect(within(row).getByText('Applying')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getAllByText('Applying').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('proposedAction-modal-confirm')).not.toBeInTheDocument();
  });

  it('hands Dismiss off to the host dismiss modal rather than recording it directly', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('proposedAction'));
    fireEvent.click(screen.getByTestId('proposedAction-modal-dismiss'));

    // The approval modal closes and the host's dismiss modal takes over for the same proposal.
    expect(screen.queryByTestId('proposedAction-modal-dismiss')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Fake dismiss modal' })).toBeInTheDocument();
    expect(baseProps.onDismiss).not.toHaveBeenCalled();
  });

  it('records the dismissal and closes the dismiss modal once it resolves', async () => {
    renderButton();
    fireEvent.click(screen.getByTestId('proposedAction'));
    fireEvent.click(screen.getByTestId('proposedAction-modal-dismiss'));

    fireEvent.click(screen.getByText('Confirm dismiss'));

    expect(baseProps.onDismiss).toHaveBeenCalledWith({
      dismissReason: 'wrong',
      rationale: 'Not needed.',
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Fake dismiss modal' })).not.toBeInTheDocument();
    });
  });

  it('shows a Declining badge on the row itself when isSubmitting is set', () => {
    renderButton({ isSubmitting: 'declining' });

    const row = screen.getByTestId('proposedAction');
    expect(within(row).getByText('Declining')).toBeInTheDocument();
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

    it('shows Applying, not Applied, for an approved proposal whose action is still executing', () => {
      // Approving only resumes the gate workflow — the action it starts still runs afterward, so
      // this row must reflect the real execution status, not assume success from `decision` alone.
      renderButton({ proposal: { ...decidedProposal, status: 'executing' } });

      expect(screen.getByText('Applying')).toBeInTheDocument();
      expect(screen.queryByText('Applied')).not.toBeInTheDocument();
    });

    it('shows a Failed badge for an approved proposal whose action did not succeed', () => {
      renderButton({ proposal: { ...decidedProposal, status: 'failed' } });

      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.queryByText('Applied')).not.toBeInTheDocument();
    });

    it('names the decider without a time when the record carries no decidedAt', () => {
      renderButton({ proposal: { ...decidedProposal, decidedAt: undefined } });

      expect(screen.getByText(/Bonnie Fishel/)).toBeInTheDocument();
    });
  });
});
