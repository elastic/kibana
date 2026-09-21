/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { ApprovalModal, type ApprovalModalProps } from './approval_modal';
import type { ApprovalProposal } from './types';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiProvider>{children}</EuiProvider>
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
  onConfirm: jest.fn(),
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

  it('titles the modal with the action name and shows the warning label', () => {
    renderModal();
    expect(screen.getByText('Apply monitored exception')).toBeInTheDocument();
    expect(screen.getByText(/approval required/i)).toBeInTheDocument();
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

  it('always renders the actor row', () => {
    renderModal();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText(/Senior Analyst/)).toBeInTheDocument();
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

  it('disables approving a proposal whose deadline has passed', () => {
    renderModal({ proposal: { ...mockProposal, expired: true } });
    expect(screen.getByTestId('approvalModal-confirm')).toBeDisabled();
  });

  it('disables approving a proposal the workflow settled as expired before its deadline', () => {
    renderModal({ proposal: { ...mockProposal, expired: false, status: 'expired' } });
    expect(screen.getByTestId('approvalModal-confirm')).toBeDisabled();
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
