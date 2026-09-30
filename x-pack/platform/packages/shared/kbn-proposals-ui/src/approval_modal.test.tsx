/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

/**
 * `ApprovalModal` is a thin wrapper: it renders `EuiModal` around `ApprovalContent` and forwards
 * `proposal`/`isSubmitting`/`currentActorName`/`alwaysAllow`/`onDismiss` straight through
 * unchanged. Everything those props drive — the badge, caption, comment, decision/outcome banner,
 * always-allow checkbox, and the built-in decline flow — is `ApprovalContent`'s own behavior and
 * is exhaustively covered by `approval_content.test.tsx`. This file only covers what belongs to
 * `ApprovalModal` itself: the `EuiModal` chrome (close button, Escape, `aria-labelledby`) and the
 * one prop it renames on the way in (`onConfirm` becomes `ApprovalContent`'s `onApprove`).
 */
describe('ApprovalModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the proposal inside a modal dialog', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Apply monitored exception')).toBeInTheDocument();
  });

  it('wires aria-labelledby to the rendered title', () => {
    renderModal();
    const modal = screen.getByRole('dialog');
    const labelId = modal.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const titleEl = document.getElementById(labelId!);
    expect(titleEl).toHaveTextContent('Apply monitored exception');
  });

  it('calls onConfirm when the approve button is clicked, wiring it to onApprove', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('approvalModal-confirm'));
    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: /closes this modal window/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
