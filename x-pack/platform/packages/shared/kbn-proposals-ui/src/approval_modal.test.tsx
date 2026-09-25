/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ApprovalModal, type ApprovalModalProps } from './approval_modal';
import type { ApprovalProposal } from './types';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const mockProposal: ApprovalProposal = {
  comment: 'This action suppresses qualys-scan on the DMZ scan pool only.',
  impact: 'low',
  status: 'pending',
  expired: false,
  actionWorkflowId: 'system-alertzero-action-edit-rule',
  action: { name: 'Apply monitored exception' },
};

const baseProps: ApprovalModalProps = {
  proposal: mockProposal,
  onConfirm: jest.fn().mockResolvedValue(undefined),
  onClose: jest.fn(),
  onDismiss: jest.fn(),
  'data-test-subj': 'approvalModal',
};

const renderModal = (props: Partial<ApprovalModalProps> = {}) =>
  render(<ApprovalModal {...baseProps} {...props} />, { wrapper });

describe('ApprovalModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('titles the modal with the action name and shows the needs-review badge', () => {
    renderModal();
    expect(screen.getByText('Apply monitored exception')).toBeInTheDocument();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
  });

  it('builds the header caption from the category and reversibility, matching the flyout row', () => {
    renderModal({
      proposal: {
        ...mockProposal,
        category: 'configure',
        action: { name: 'Apply monitored exception', reversible: true },
      },
    });
    expect(screen.getByText('Configure • Reversible')).toBeInTheDocument();
  });

  it('omits the header caption when the proposal has neither a category nor reversibility', () => {
    renderModal({ proposal: { ...mockProposal, category: undefined, action: undefined } });
    expect(screen.queryByText(/reversible/i)).not.toBeInTheDocument();
  });

  it('falls back to the workflow id when the action metadata carries no name', () => {
    renderModal({ proposal: { ...mockProposal, action: undefined } });
    expect(screen.getByText('system-alertzero-action-edit-rule')).toBeInTheDocument();
  });

  it('falls back to the no-action label when the proposal carries no action at all', () => {
    renderModal({
      proposal: { ...mockProposal, action: undefined, actionWorkflowId: undefined },
    });
    expect(screen.getByText('No automated action')).toBeInTheDocument();
  });

  it("renders the proposal's own comment as the body", () => {
    renderModal();
    expect(
      screen.getByText('This action suppresses qualys-scan on the DMZ scan pool only.')
    ).toBeInTheDocument();
  });

  it('does not render always-allow checkbox when alwaysAllow is omitted', () => {
    renderModal();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('renders always-allow checkbox when alwaysAllow is supplied', () => {
    renderModal({
      alwaysAllow: {
        id: 'always-allow',
        label: <span>Always allow session revocation in this case</span>,
        checked: false,
        onChange: jest.fn(),
      },
    });
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('Always allow session revocation in this case')).toBeInTheDocument();
  });

  it('calls onChange when always-allow checkbox is toggled', () => {
    const onChange = jest.fn();
    renderModal({
      alwaysAllow: { id: 'always-allow', label: 'Always allow', checked: false, onChange },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onConfirm when the approve button is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('approvalModal-confirm'));
    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows Applying when isSubmitting is set, hiding the actions', () => {
    renderModal({ isSubmitting: 'applying', currentActorName: 'Ava' });

    // The badge and the outcome banner's own title both say it.
    expect(screen.getAllByText('Applying').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByTestId('approvalModal-confirm')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Ava/).length).toBeGreaterThan(0);
  });

  it('keeps showing Applying across a close and reopen mid-submission, since isSubmitting is sourced externally', () => {
    const { unmount } = renderModal({ isSubmitting: 'applying', currentActorName: 'Ava' });
    expect(screen.getAllByText('Applying').length).toBeGreaterThanOrEqual(2);
    unmount();

    // A fresh mount — standing in for the modal being reopened — reads the same externally
    // sourced `isSubmitting`, unlike a local `useState` that would have died with the unmount.
    renderModal({ isSubmitting: 'applying', currentActorName: 'Ava' });
    expect(screen.getAllByText('Applying').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps showing Applying for a recorded decision whose action is still executing', () => {
    renderModal({
      proposal: {
        ...mockProposal,
        decision: 'approved',
        decidedBy: { fullName: 'Ava', username: 'ava', email: null },
        decidedAt: '2024-01-01T17:20:00.000Z',
        status: 'executing',
      },
    });

    expect(screen.getAllByText('Applying').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Applied')).not.toBeInTheDocument();
  });

  it('shows Applied only once the refetched proposal confirms the action succeeded', () => {
    const decidedBy = { fullName: 'Ava', username: 'ava', email: null };
    const { rerender } = renderModal({
      proposal: {
        ...mockProposal,
        decision: 'approved',
        decidedBy,
        decidedAt: '2024-01-01T17:20:00.000Z',
        status: 'executing',
      },
    });
    expect(screen.queryByText('Applied')).not.toBeInTheDocument();

    rerender(
      <ApprovalModal
        {...baseProps}
        proposal={{
          ...mockProposal,
          decision: 'approved',
          decidedBy,
          decidedAt: '2024-01-01T17:20:00.000Z',
          status: 'succeeded',
        }}
      />
    );

    // The badge's own short label and the banner's own full title.
    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('Applied successfully')).toBeInTheDocument();
  });

  it('shows a Failed outcome when the action the approval started did not succeed', () => {
    renderModal({
      proposal: {
        ...mockProposal,
        decision: 'approved',
        decidedBy: { fullName: 'Ava', username: 'ava', email: null },
        decidedAt: '2024-01-01T17:20:00.000Z',
        status: 'failed',
      },
    });

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Action failed')).toBeInTheDocument();
    expect(screen.queryByTestId('approvalModal-confirm')).not.toBeInTheDocument();
  });

  it('reverts to pending and shows an error when onConfirm rejects', async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error('The action rejected its inputs.'));
    renderModal({ onConfirm });

    fireEvent.click(screen.getByTestId('approvalModal-confirm'));

    await waitFor(() =>
      expect(screen.getByText('The action rejected its inputs.')).toBeInTheDocument()
    );
    expect(screen.getByTestId('approvalModal-confirm')).toBeInTheDocument();
    expect(screen.queryByText('Applied')).not.toBeInTheDocument();
  });

  it('renders a decided proposal as a read-only history rather than offering another decision', () => {
    renderModal({
      proposal: {
        ...mockProposal,
        decision: 'dismissed',
        decidedBy: { username: 'bfishel', fullName: 'Bonnie Fishel', email: null },
        decidedAt: '2024-01-01T17:20:00.000Z',
        rationale: 'Already reported elsewhere (duplicate)',
      },
    });

    // The badge and the outcome banner's own title both say it.
    expect(screen.getAllByText('Declined').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Already reported elsewhere \(duplicate\)/)).toBeInTheDocument();
    expect(screen.queryByTestId('approvalModal-confirm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('approvalModal-dismiss')).not.toBeInTheDocument();
  });

  it('disables approving a proposal whose deadline has passed', () => {
    renderModal({ proposal: { ...mockProposal, expired: true } });
    expect(screen.getByTestId('approvalModal-confirm')).toBeDisabled();
  });

  it('disables approving a proposal the workflow settled as expired before its deadline', () => {
    renderModal({ proposal: { ...mockProposal, expired: false, status: 'expired' } });
    expect(screen.getByTestId('approvalModal-confirm')).toBeDisabled();
  });

  it('disables declining an expired proposal too, not just approving it', () => {
    renderModal({ proposal: { ...mockProposal, expired: true } });
    expect(screen.getByTestId('approvalModal-dismiss')).toBeDisabled();
  });

  it('routes Dismiss to onDismiss rather than silently closing', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('approvalModal-dismiss'));
    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('omits Dismiss for a host that cannot record one', () => {
    renderModal({ onDismiss: undefined });
    expect(screen.queryByTestId('approvalModal-dismiss')).not.toBeInTheDocument();
  });

  it('wires aria-labelledby to the rendered title', () => {
    renderModal();
    const modal = screen.getByRole('dialog');
    const labelId = modal.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const titleEl = document.getElementById(labelId!);
    expect(titleEl).toHaveTextContent('Apply monitored exception');
  });
});
