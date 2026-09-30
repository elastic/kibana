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
    // category/reversibility parts are conditional. Full coverage of this lives in
    // `approval_modal.test.tsx`; this just confirms `ApprovalContent` derives it the same way.
    renderContent({ proposal: { ...baseProposal, category: undefined, action: undefined } });
    expect(screen.queryByText(/reversible/i)).not.toBeInTheDocument();
    expect(screen.getByText('Critical impact')).toBeInTheDocument();
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

  it('hides the Approve button once the proposal has expired, since expiry is itself a decision', () => {
    // Expiry resolves to a real (actor-less) decision via `getProposalDecision`, so the footer
    // — Approve alongside it — is gone the same way it is for any other decided proposal.
    renderContent({ proposal: { ...baseProposal, expired: true } });
    expect(screen.queryByTestId('approvalContent-confirm')).not.toBeInTheDocument();
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

  it('renders an expiry explanation when the proposal has expired', () => {
    renderContent({ proposal: { ...baseProposal, expired: true } });
    expect(
      screen.getByText('The decision deadline has passed. This proposal can no longer be actioned.')
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

    it('swaps the comment for the reason form, and the footer for Cancel/Decline, once the trigger is clicked', () => {
      renderContent({ onDismiss: jest.fn(), 'data-test-subj': 'card' });
      fireEvent.click(screen.getByTestId('card-dismiss'));

      expect(screen.queryByText('Isolate the compromised host.')).not.toBeInTheDocument();
      expect(screen.getByTestId('card-decline-form')).toBeInTheDocument();
      expect(screen.getByTestId('card-cancel-decline')).toBeInTheDocument();
      expect(screen.getByTestId('card-confirm-decline')).toBeInTheDocument();
      expect(screen.queryByTestId('card-confirm')).not.toBeInTheDocument();
    });

    it('returns to view without declining when Cancel is clicked', () => {
      const onDismiss = jest.fn();
      renderContent({ onDismiss, 'data-test-subj': 'card' });
      fireEvent.click(screen.getByTestId('card-dismiss'));
      fireEvent.click(screen.getByTestId('card-cancel-decline'));

      expect(screen.getByText('Isolate the compromised host.')).toBeInTheDocument();
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('calls onDismiss with the selected reason and rationale on confirm', async () => {
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
