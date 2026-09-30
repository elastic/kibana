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
  // What the server stores when the caller names nothing itself.
  title: 'Apply monitored exception',
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

  it('explains a previous execution failure, same as the Agent Builder chat card', () => {
    renderModal({
      proposal: { ...mockProposal, previousExecutionError: 'HTTP 400: invalid query' },
    });
    expect(screen.getByText('A previous attempt at this action failed')).toBeInTheDocument();
    expect(screen.getByText('HTTP 400: invalid query')).toBeInTheDocument();
  });

  it('explains an expired deadline, same as the Agent Builder chat card', () => {
    renderModal({ proposal: { ...mockProposal, expired: true } });
    expect(
      screen.getByText('The decision deadline has passed. This proposal can no longer be actioned.')
    ).toBeInTheDocument();
  });

  it('builds the header caption from category, reversibility and impact, unlike the flyout row which omits impact', () => {
    renderModal({
      proposal: {
        ...mockProposal,
        category: 'configure',
        action: { name: 'Apply monitored exception', reversible: true },
      },
    });
    expect(screen.getByText('Configure • Reversible • Low impact')).toBeInTheDocument();
  });

  it('adds impact and the decision deadline the flyout row omits, since the modal has the room for them', () => {
    const expiresAt = '2024-01-05T17:00:00.000Z';
    renderModal({
      proposal: {
        ...mockProposal,
        impact: 'critical',
        category: 'configure',
        action: { name: 'Apply monitored exception', reversible: true },
        expiresAt,
      },
    });
    // Computed the same way the implementation does, rather than a hardcoded guess: the exact
    // rendering of `toLocaleString` depends on the environment's locale/ICU data.
    const formattedDeadline = new Date(expiresAt).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    expect(
      screen.getByText(`Configure • Reversible • Critical impact • Expires ${formattedDeadline}`)
    ).toBeInTheDocument();
  });

  it('shows Expired instead of a deadline once the decision window has passed', () => {
    renderModal({
      proposal: { ...mockProposal, expired: true, expiresAt: '2024-01-05T17:00:00.000Z' },
    });
    expect(screen.getByText('Low impact • Expired')).toBeInTheDocument();
  });

  it('drops category and reversibility from the caption when the proposal has neither, keeping impact', () => {
    renderModal({ proposal: { ...mockProposal, category: undefined, action: undefined } });
    expect(screen.queryByText(/reversible/i)).not.toBeInTheDocument();
    expect(screen.getByText('Low impact')).toBeInTheDocument();
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

  it('shows Approved rather than Applied for an approved proposal that carried no action to run', () => {
    // `no_action` covers a proposal with nothing to run at all — distinct from `applied`, which
    // claims an automated action actually ran and succeeded.
    renderModal({
      proposal: {
        ...mockProposal,
        decision: 'approved',
        decidedBy: { fullName: 'Ava', username: 'ava', email: null },
        decidedAt: '2024-01-01T17:20:00.000Z',
        status: 'no_action',
      },
    });

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Approved — no action to run')).toBeInTheDocument();
    expect(screen.queryByText('Applied')).not.toBeInTheDocument();
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

  it('shows Expired rather than Needs review, hiding the actions, once the deadline has passed', () => {
    renderModal({ proposal: { ...mockProposal, expired: true } });
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.queryByText('Needs review')).not.toBeInTheDocument();
    expect(screen.queryByTestId('approvalModal-confirm')).not.toBeInTheDocument();
  });

  it('shows Expired for a proposal the workflow settled as expired before its deadline', () => {
    renderModal({ proposal: { ...mockProposal, expired: false, status: 'expired' } });
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.queryByTestId('approvalModal-confirm')).not.toBeInTheDocument();
  });

  it('hides declining an expired proposal too, not just approving it', () => {
    renderModal({ proposal: { ...mockProposal, expired: true } });
    expect(screen.queryByTestId('approvalModal-dismiss')).not.toBeInTheDocument();
  });

  it('omits Dismiss for a host that cannot record one', () => {
    renderModal({ onDismiss: undefined });
    expect(screen.queryByTestId('approvalModal-dismiss')).not.toBeInTheDocument();
  });

  describe('declining', () => {
    const openDeclineForm = () => fireEvent.click(screen.getByTestId('approvalModal-dismiss'));

    it('shows the reason form in place of the body, keeping the header context visible', () => {
      renderModal();
      openDeclineForm();

      // Header context (title, badge, caption) stays exactly where it was.
      expect(screen.getByText('Apply monitored exception')).toBeInTheDocument();
      expect(screen.getByText('Needs review')).toBeInTheDocument();
      // The comment (proposal body) is replaced by the reason form.
      expect(
        screen.queryByText('This action suppresses qualys-scan on the DMZ scan pool only.')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('approvalModal-decline-form-reason')).toBeInTheDocument();
    });

    it('defaults to "Decline without a reason" and enables Decline immediately', () => {
      renderModal();
      openDeclineForm();

      expect(screen.getByRole('radio', { name: 'Decline without a reason' })).toBeChecked();
      expect(screen.getByTestId('approvalModal-confirm-decline')).not.toBeDisabled();
    });

    it('requires free text only when Other is selected', () => {
      renderModal();
      openDeclineForm();

      fireEvent.click(screen.getByRole('radio', { name: 'Other' }));
      expect(screen.getByTestId('approvalModal-confirm-decline')).toBeDisabled();

      fireEvent.change(screen.getByTestId('approvalModal-decline-form-rationale'), {
        target: { value: 'Fixed the underlying rule instead.' },
      });
      expect(screen.getByTestId('approvalModal-confirm-decline')).not.toBeDisabled();
    });

    it('returns to the approval modal without declining when Cancel is clicked', () => {
      renderModal();
      openDeclineForm();
      fireEvent.click(screen.getByRole('radio', { name: 'Other' }));

      fireEvent.click(screen.getByTestId('approvalModal-cancel-decline'));

      expect(screen.getByTestId('approvalModal-confirm')).toBeInTheDocument();
      expect(baseProps.onDismiss).not.toHaveBeenCalled();

      // Cancelling resets the form rather than remembering the abandoned selection.
      openDeclineForm();
      expect(screen.getByRole('radio', { name: 'Decline without a reason' })).toBeChecked();
    });

    it('submits the selected reason and free text together', async () => {
      const onDismiss = jest.fn().mockResolvedValue(undefined);
      renderModal({ onDismiss });
      openDeclineForm();

      fireEvent.click(
        screen.getByRole('radio', { name: 'Already reported elsewhere (duplicate)' })
      );
      fireEvent.change(screen.getByTestId('approvalModal-decline-form-rationale'), {
        target: { value: 'Same as INV-42.' },
      });
      fireEvent.click(screen.getByTestId('approvalModal-confirm-decline'));

      await waitFor(() =>
        expect(onDismiss).toHaveBeenCalledWith({
          dismissReason: 'duplicate',
          rationale: 'Same as INV-42.',
        })
      );
    });

    it('omits rationale entirely when the field was left blank', async () => {
      const onDismiss = jest.fn().mockResolvedValue(undefined);
      renderModal({ onDismiss });
      openDeclineForm();

      fireEvent.click(screen.getByTestId('approvalModal-confirm-decline'));

      await waitFor(() =>
        expect(onDismiss).toHaveBeenCalledWith({ dismissReason: 'no_reason', rationale: undefined })
      );
    });

    it('shows an error and keeps the form open when the decline request fails', async () => {
      const onDismiss = jest.fn().mockRejectedValue(new Error('The action rejected its inputs.'));
      renderModal({ onDismiss });
      openDeclineForm();

      fireEvent.click(screen.getByTestId('approvalModal-confirm-decline'));

      await waitFor(() =>
        expect(screen.getByText('The action rejected its inputs.')).toBeInTheDocument()
      );
      // Same error-banner path `onConfirm` uses — consistent with other proposed-action errors.
      expect(screen.getByTestId('approvalModal-decline-form-reason')).toBeInTheDocument();
    });
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
