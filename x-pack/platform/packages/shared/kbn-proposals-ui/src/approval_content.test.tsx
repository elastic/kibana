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
import { ApprovalContent, type ApprovalContentProps } from './approval_content';
import type { ApprovalProposal } from './types';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const baseProposal: ApprovalProposal = {
  title: 'Block IP 10.0.0.4',
  impact: 'critical',
  comment: 'Isolate the compromised host.',
  status: 'pending',
  expired: false,
};

const baseProps: ApprovalContentProps = {
  proposal: baseProposal,
  onApprove: jest.fn(),
  secondaryActions: [
    {
      label: 'Cancel',
      onClick: jest.fn(),
      'data-test-subj': 'content-cancel',
    },
  ],
  'data-test-subj': 'approvalContent',
};

const renderContent = (props: Partial<ApprovalContentProps> = {}) =>
  render(<ApprovalContent {...baseProps} {...props} />, { wrapper });

/** DOM order, so the bitmask is spelled out once rather than at every call site. */
const isBefore = (first: Element, second: Element) =>
  // eslint-disable-next-line no-bitwise
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('ApprovalContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header', () => {
    renderContent();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
  });

  it('renders a caption derived from the proposal, e.g. category, reversibility and impact', () => {
    renderContent({
      proposal: {
        ...baseProposal,
        category: 'configure',
        action: { name: 'Block IP', reversible: true },
      },
    });
    expect(screen.getByText('Configure • Reversible • Critical impact')).toBeInTheDocument();
  });

  it('drops category and reversibility from the caption when the proposal has neither, keeping impact', () => {
    // Every proposal carries an impact, so the caption itself is never fully empty — only its
    // category/reversibility parts are conditional.
    renderContent({ proposal: { ...baseProposal, category: undefined, action: undefined } });
    expect(screen.queryByText(/reversible/i)).not.toBeInTheDocument();
    expect(screen.getByText('Critical impact')).toBeInTheDocument();
  });

  it('adds the decision deadline to the caption when the proposal carries one', () => {
    const expiresAt = '2024-01-05T17:00:00.000Z';
    renderContent({
      proposal: {
        ...baseProposal,
        category: 'configure',
        action: { name: 'Block IP', reversible: true },
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

  it('shows Expired in the caption instead of the deadline once it has passed', () => {
    renderContent({
      proposal: { ...baseProposal, expired: true, expiresAt: '2024-01-05T17:00:00.000Z' },
    });
    expect(screen.getByText('Critical impact • Expired')).toBeInTheDocument();
  });

  it('renders the comment', () => {
    renderContent();
    expect(screen.getByText('Isolate the compromised host.')).toBeInTheDocument();
  });

  it('renders emphasis in the comment as markdown rather than literal asterisks', () => {
    renderContent({ proposal: { ...baseProposal, comment: 'Revoking **all** sessions.' } });
    expect(screen.getByText('all').tagName).toBe('STRONG');
  });

  it('renders a GFM table in the comment, which is how a proposal lists what it touches', () => {
    const { container } = renderContent({
      proposal: {
        ...baseProposal,
        comment: ['| Field | Value |', '| --- | --- |', '| host | fin-dc-01 |'].join('\n'),
      },
    });

    expect(container.querySelector('table')).toBeInTheDocument();
    expect(screen.getByText('fin-dc-01')).toBeInTheDocument();
  });

  it('renders the secondary action before the primary, so the committing decision sits last', () => {
    renderContent();
    expect(
      isBefore(screen.getByTestId('content-cancel'), screen.getByTestId('approvalContent-confirm'))
    ).toBe(true);
  });

  it('renders the icon a secondary action asks for', () => {
    renderContent({
      secondaryActions: [
        { label: 'Dismiss', iconType: 'cross', onClick: jest.fn(), 'data-test-subj': 'content-x' },
      ],
    });
    expect(screen.getByTestId('content-x').querySelector('[data-euiicon-type]')).toBeTruthy();
  });

  it('renders the Approve button, labeled the same way regardless of host', () => {
    renderContent();
    expect(screen.getByTestId('approvalContent-confirm')).toHaveTextContent('Approve');
  });

  it('colors the Approve button by the proposal tone: danger for high/critical impact', () => {
    // `baseProposal` is `critical` impact, so the default render already covers this.
    renderContent();
    expect(screen.getByTestId('approvalContent-confirm').className).toContain('danger');
  });

  it('colors the Approve button primary for low/medium impact, not success', () => {
    // Regression check: the chat card's Approve button was once styled `success` here,
    // independent of — and inconsistent with — the flyout modal's tone-derived `primary`. Both
    // hosts now share this one derivation, so this covers both.
    renderContent({ proposal: { ...baseProposal, impact: 'low' } });
    const className = screen.getByTestId('approvalContent-confirm').className;
    expect(className).toContain('primary');
    expect(className).not.toContain('success');
    expect(className).not.toContain('danger');
  });

  it('renders secondary action buttons as empty buttons', () => {
    renderContent();
    expect(screen.getByTestId('content-cancel')).toHaveTextContent('Cancel');
  });

  it('calls onApprove when the Approve button is clicked', () => {
    const onApprove = jest.fn();
    renderContent({ onApprove });
    fireEvent.click(screen.getByTestId('approvalContent-confirm'));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('calls secondaryAction.onClick when secondary button is clicked', () => {
    const onClick = jest.fn();
    renderContent({
      secondaryActions: [{ label: 'Cancel', onClick, 'data-test-subj': 'content-cancel' }],
    });
    fireEvent.click(screen.getByTestId('content-cancel'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('omits the footer when neither onApprove nor secondaryActions are supplied', () => {
    renderContent({ onApprove: undefined, secondaryActions: undefined });
    expect(screen.queryByTestId('approvalContent-confirm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('content-cancel')).not.toBeInTheDocument();
  });

  it('renders the previous-execution-error callout between the body and the footer while pending', () => {
    renderContent({
      proposal: { ...baseProposal, previousExecutionError: 'HTTP 400: something went wrong' },
    });
    expect(screen.getByText('A previous attempt at this action failed')).toBeInTheDocument();
    expect(screen.getByText('HTTP 400: something went wrong')).toBeInTheDocument();
    expect(
      isBefore(
        screen.getByText('A previous attempt at this action failed'),
        screen.getByTestId('approvalContent-confirm')
      )
    ).toBe(true);
  });

  it('hides the previous-execution-error callout once the proposal is decided', () => {
    renderContent({
      proposal: {
        ...baseProposal,
        previousExecutionError: 'HTTP 400: something went wrong',
        decision: 'approved',
        status: 'succeeded',
        decidedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(screen.queryByText('A previous attempt at this action failed')).not.toBeInTheDocument();
  });

  it('renders an expiry explanation when the deadline has passed', () => {
    renderContent({ proposal: { ...baseProposal, expired: true } });
    expect(
      screen.getByText(
        'This proposal expired before a decision was made and can no longer be actioned.'
      )
    ).toBeInTheDocument();
  });

  it('renders always-allow checkbox when alwaysAllow is supplied', () => {
    renderContent({
      alwaysAllow: {
        id: 'always-allow',
        label: 'Always allow',
        checked: false,
        onChange: jest.fn(),
      },
    });
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('does not render always-allow checkbox when alwaysAllow is omitted', () => {
    renderContent({ alwaysAllow: undefined });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('calls alwaysAllow.onChange when checkbox is toggled', () => {
    const onChange = jest.fn();
    renderContent({
      alwaysAllow: {
        id: 'always-allow',
        label: 'Always allow',
        checked: false,
        onChange,
      },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  describe('decision outcome', () => {
    it('shows Applying when isSubmitting is set, hiding the actions', () => {
      renderContent({ isSubmitting: 'applying', currentActorName: 'Ava' });

      // The badge and the outcome banner's own title both say it.
      expect(screen.getAllByText('Applying').length).toBeGreaterThanOrEqual(2);
      expect(screen.queryByTestId('approvalContent-confirm')).not.toBeInTheDocument();
      expect(screen.getAllByText(/Ava/).length).toBeGreaterThan(0);
    });

    it('keeps showing Applying across an unmount and remount mid-submission, since isSubmitting is sourced externally', () => {
      const { unmount } = renderContent({ isSubmitting: 'applying', currentActorName: 'Ava' });
      expect(screen.getAllByText('Applying').length).toBeGreaterThanOrEqual(2);
      unmount();

      // A fresh mount — standing in for the host being closed and reopened — reads the same
      // externally sourced `isSubmitting`, unlike a local `useState` that would have died with
      // the unmount.
      renderContent({ isSubmitting: 'applying', currentActorName: 'Ava' });
      expect(screen.getAllByText('Applying').length).toBeGreaterThanOrEqual(2);
    });

    it('keeps showing Applying for a recorded decision whose action is still executing', () => {
      renderContent({
        proposal: {
          ...baseProposal,
          decision: 'approved',
          decidedBy: { fullName: 'Ava', username: 'ava', email: null },
          decidedAt: '2024-01-01T17:20:00.000Z',
          status: 'executing',
        },
      });

      // Approving only resumes the gate workflow — while the action it started is still
      // `executing`, this must not yet claim it applied.
      expect(screen.getAllByText('Applying').length).toBeGreaterThanOrEqual(2);
      expect(screen.queryByText('Applied')).not.toBeInTheDocument();
    });

    it('shows Applied only once the refetched proposal confirms the action succeeded', () => {
      const decidedBy = { fullName: 'Ava', username: 'ava', email: null };
      const { rerender } = renderContent({
        proposal: {
          ...baseProposal,
          decision: 'approved',
          decidedBy,
          decidedAt: '2024-01-01T17:20:00.000Z',
          status: 'executing',
        },
      });
      expect(screen.queryByText('Applied')).not.toBeInTheDocument();

      rerender(
        <ApprovalContent
          {...baseProps}
          proposal={{
            ...baseProposal,
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
      renderContent({
        proposal: {
          ...baseProposal,
          decision: 'approved',
          decidedBy: { fullName: 'Ava', username: 'ava', email: null },
          decidedAt: '2024-01-01T17:20:00.000Z',
          status: 'failed',
        },
      });

      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Action failed')).toBeInTheDocument();
      expect(screen.queryByTestId('approvalContent-confirm')).not.toBeInTheDocument();
    });

    it('shows Approved rather than Applied for an approved proposal that carried no action to run', () => {
      // `no_action` covers a proposal with nothing to run at all — distinct from `applied`, which
      // claims an automated action actually ran and succeeded.
      renderContent({
        proposal: {
          ...baseProposal,
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

    it('reverts to pending and shows an error when onApprove rejects', async () => {
      const onApprove = jest.fn().mockRejectedValue(new Error('The action rejected its inputs.'));
      renderContent({ onApprove });

      fireEvent.click(screen.getByTestId('approvalContent-confirm'));

      await waitFor(() =>
        expect(screen.getByText('The action rejected its inputs.')).toBeInTheDocument()
      );
      expect(screen.getByTestId('approvalContent-confirm')).toBeInTheDocument();
      expect(screen.queryByText('Applied')).not.toBeInTheDocument();
    });

    it('renders a decided proposal as a read-only history rather than offering another decision', () => {
      renderContent({
        onDismiss: jest.fn(),
        proposal: {
          ...baseProposal,
          decision: 'dismissed',
          decidedBy: { username: 'bfishel', fullName: 'Bonnie Fishel', email: null },
          decidedAt: '2024-01-01T17:20:00.000Z',
          rationale: 'Already reported elsewhere (duplicate)',
        },
      });

      // The badge and the outcome banner's own title both say it.
      expect(screen.getAllByText('Declined').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/Already reported elsewhere \(duplicate\)/)).toBeInTheDocument();
      expect(screen.queryByTestId('approvalContent-confirm')).not.toBeInTheDocument();
      expect(screen.queryByTestId('approvalContent-dismiss')).not.toBeInTheDocument();
    });

    it('shows the Expired badge instead of Needs review, hiding the actions, once the deadline has passed', () => {
      // Expiry resolves to a real (actor-less) decision via `getProposalDecision`, so the footer
      // — Approve alongside it — is gone the same way it is for any other decided proposal.
      renderContent({ onDismiss: jest.fn(), proposal: { ...baseProposal, expired: true } });
      expect(screen.getByText('Expired')).toBeInTheDocument();
      expect(screen.queryByText('Needs review')).not.toBeInTheDocument();
      expect(screen.queryByTestId('approvalContent-confirm')).not.toBeInTheDocument();
      expect(screen.queryByTestId('approvalContent-dismiss')).not.toBeInTheDocument();
    });

    it('shows Expired for a proposal the workflow settled as expired before its deadline', () => {
      renderContent({ proposal: { ...baseProposal, expired: false, status: 'expired' } });
      expect(screen.getByText('Expired')).toBeInTheDocument();
      expect(screen.queryByTestId('approvalContent-confirm')).not.toBeInTheDocument();
      // The callout's wording must hold for this cause too, not just a deadline that passed —
      // `isProposalExpired` reports both the same way, so the explanation cannot claim one.
      expect(
        screen.getByText(
          'This proposal expired before a decision was made and can no longer be actioned.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('built-in decline flow (onDismiss)', () => {
    it('renders a Decline trigger next to the primary action when onDismiss is supplied', () => {
      renderContent({ onDismiss: jest.fn(), 'data-test-subj': 'card' });
      expect(screen.getByTestId('card-dismiss')).toBeInTheDocument();
    });

    it('omits the Decline trigger when onDismiss is not supplied', () => {
      renderContent({ onDismiss: undefined, 'data-test-subj': 'card' });
      expect(screen.queryByTestId('card-dismiss')).not.toBeInTheDocument();
    });

    it('hides the Decline trigger too, once the proposal has expired', () => {
      renderContent({
        onDismiss: jest.fn(),
        proposal: { ...baseProposal, expired: true },
        'data-test-subj': 'card',
      });
      expect(screen.queryByTestId('card-dismiss')).not.toBeInTheDocument();
    });

    it('shows the reason form in place of the body, keeping the header context visible', () => {
      renderContent({ onDismiss: jest.fn(), 'data-test-subj': 'card' });
      fireEvent.click(screen.getByTestId('card-dismiss'));

      // Header context (title, badge) stays exactly where it was.
      expect(screen.getByText('Block IP 10.0.0.4')).toBeInTheDocument();
      expect(screen.getByText('Needs review')).toBeInTheDocument();
      // The comment (proposal body) is replaced by the reason form.
      expect(screen.queryByText('Isolate the compromised host.')).not.toBeInTheDocument();
      expect(screen.getByTestId('card-decline-form')).toBeInTheDocument();
      expect(screen.getByTestId('card-cancel-decline')).toBeInTheDocument();
      expect(screen.getByTestId('card-confirm-decline')).toBeInTheDocument();
      expect(screen.queryByTestId('card-confirm')).not.toBeInTheDocument();
    });

    it('defaults to "Decline without a reason" and enables Decline immediately', () => {
      renderContent({ onDismiss: jest.fn(), 'data-test-subj': 'card' });
      fireEvent.click(screen.getByTestId('card-dismiss'));

      expect(screen.getByRole('radio', { name: 'Decline without a reason' })).toBeChecked();
      expect(screen.getByTestId('card-confirm-decline')).not.toBeDisabled();
    });

    it('requires free text only when Other is selected', () => {
      renderContent({ onDismiss: jest.fn(), 'data-test-subj': 'card' });
      fireEvent.click(screen.getByTestId('card-dismiss'));

      fireEvent.click(screen.getByRole('radio', { name: 'Other' }));
      expect(screen.getByTestId('card-confirm-decline')).toBeDisabled();

      fireEvent.change(screen.getByTestId('card-decline-form-rationale'), {
        target: { value: 'Fixed the underlying rule instead.' },
      });
      expect(screen.getByTestId('card-confirm-decline')).not.toBeDisabled();
    });

    it('returns to view without declining when Cancel is clicked', () => {
      const onDismiss = jest.fn();
      renderContent({ onDismiss, 'data-test-subj': 'card' });
      fireEvent.click(screen.getByTestId('card-dismiss'));
      fireEvent.click(screen.getByRole('radio', { name: 'Other' }));

      fireEvent.click(screen.getByTestId('card-cancel-decline'));

      expect(screen.getByText('Isolate the compromised host.')).toBeInTheDocument();
      expect(onDismiss).not.toHaveBeenCalled();

      // Cancelling resets the form rather than remembering the abandoned selection.
      fireEvent.click(screen.getByTestId('card-dismiss'));
      expect(screen.getByRole('radio', { name: 'Decline without a reason' })).toBeChecked();
    });

    it('calls onDismiss with the selected reason and rationale on confirm', async () => {
      const onDismiss = jest.fn().mockResolvedValue(undefined);
      renderContent({ onDismiss, 'data-test-subj': 'card' });
      fireEvent.click(screen.getByTestId('card-dismiss'));

      fireEvent.click(
        screen.getByRole('radio', { name: 'Already reported elsewhere (duplicate)' })
      );
      fireEvent.change(screen.getByTestId('card-decline-form-rationale'), {
        target: { value: 'Same as INV-42.' },
      });
      fireEvent.click(screen.getByTestId('card-confirm-decline'));

      await waitFor(() =>
        expect(onDismiss).toHaveBeenCalledWith({
          dismissReason: 'duplicate',
          rationale: 'Same as INV-42.',
        })
      );
    });

    it('omits rationale entirely when the field was left blank', async () => {
      const onDismiss = jest.fn().mockResolvedValue(undefined);
      renderContent({ onDismiss, 'data-test-subj': 'card' });
      fireEvent.click(screen.getByTestId('card-dismiss'));
      fireEvent.click(screen.getByTestId('card-confirm-decline'));

      await waitFor(() =>
        expect(onDismiss).toHaveBeenCalledWith({ dismissReason: 'no_reason', rationale: undefined })
      );
    });

    it('shows an error and keeps the form open when onDismiss rejects', async () => {
      const onDismiss = jest.fn().mockRejectedValue(new Error('Could not decline.'));
      renderContent({ onDismiss, 'data-test-subj': 'card' });
      fireEvent.click(screen.getByTestId('card-dismiss'));
      fireEvent.click(screen.getByTestId('card-confirm-decline'));

      await waitFor(() => expect(screen.getByText('Could not decline.')).toBeInTheDocument());
      expect(screen.getByTestId('card-decline-form')).toBeInTheDocument();
    });

    it('hides the reason form once isSubmitting is "declining", since the banner already says so', () => {
      const onDismiss = jest.fn();
      const { rerender } = renderContent({ onDismiss, 'data-test-subj': 'card' });
      fireEvent.click(screen.getByTestId('card-dismiss'));
      expect(screen.getByTestId('card-decline-form')).toBeInTheDocument();

      rerender(
        <ApprovalContent
          {...baseProps}
          onDismiss={onDismiss}
          isSubmitting="declining"
          data-test-subj="card"
        />
      );
      expect(screen.queryByTestId('card-decline-form')).not.toBeInTheDocument();
    });
  });
});
