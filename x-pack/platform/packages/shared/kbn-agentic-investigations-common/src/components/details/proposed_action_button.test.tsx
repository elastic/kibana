/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { ApprovalProposal } from '@kbn/proposals-ui';
import { ProposedActionButton, type ProposedActionButtonProps } from './proposed_action_button';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiProvider>{children}</EuiProvider>
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
  onConfirm: jest.fn(),
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

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/approval required/i)).toBeInTheDocument();
    expect(
      screen.getAllByText('Isolate cfo-mbp-14 — host isolation').length
    ).toBeGreaterThanOrEqual(2);
  });

  it('commits the approval and closes the modal when Approve is clicked', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('proposedAction'));

    fireEvent.click(screen.getByTestId('proposedAction-modal-confirm'));

    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
});
