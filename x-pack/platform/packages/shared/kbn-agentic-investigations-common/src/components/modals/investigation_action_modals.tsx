/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Investigation } from '../../types';
import type { CardActionType } from '../actions/base_actions';
import { AssignActionModal } from './assign_action_modal';
import { BaseActionModal } from './base_action_modal';
import { ApprovalModal } from './approval_modal/approval_modal';
import type { ApprovalProposal } from './approval_modal/types';
import { MODAL_TRANSLATIONS } from './translations';

/**
 * Generic over the host's own proposal type so a caller's handlers keep receiving the row they
 * hold — `ApprovalProposal` is only the subset this modal reads, and narrowing the callbacks to
 * it would strip the `actionInput` an approval has to submit.
 */
export interface InvestigationActionModalsProps<
  TProposal extends ApprovalProposal = ApprovalProposal
> {
  /** Action awaiting confirmation, or `null` when no action modal is open. */
  action: CardActionType | null;
  recordId: Investigation['recordId'] | null;
  initialAssignee?: string | null;
  /** Proposal awaiting a decision, if any. */
  approvalProposal?: TProposal;
  onCloseAction: () => void;
  onCloseApproval: () => void;
  /**
   * Commits the approval. Receives the proposal rather than closing over it, so a caller's
   * handler stays referentially stable across renders. Falls back to closing the modal, so a
   * host that opens one with no mutation to call cannot leave it stuck open.
   */
  onConfirmApproval?: (proposal: TProposal) => void;
  /**
   * Records a dismissal from the approval modal. Omitted by hosts that cannot capture one,
   * which also hides the Dismiss button rather than leaving it inert.
   */
  onDismissApproval?: (proposal: TProposal) => void;
  /**
   * Replaces the default rationale-only dismiss modal. Supplied when a solution's
   * dismissal captures more than a rationale — a structured reason, say — which changes
   * what the modal renders and what local state it owns, not just what confirming does.
   */
  renderDismissModal?: (props: { recordId: string; onClose: () => void }) => React.ReactNode;
}

/**
 * The action modals an investigation can raise.
 *
 * Rendered by whichever tree owns the trigger: the queue page for card actions, and the flyout
 * footer for its own, since the registry flyout mounts outside the page's React tree.
 */
export const InvestigationActionModals = <TProposal extends ApprovalProposal = ApprovalProposal>({
  action,
  recordId,
  initialAssignee,
  approvalProposal,
  onCloseAction,
  onCloseApproval,
  onConfirmApproval,
  onDismissApproval,
  renderDismissModal,
}: InvestigationActionModalsProps<TProposal>) => (
  <>
    {approvalProposal ? (
      <ApprovalModal
        proposal={approvalProposal}
        onConfirm={() =>
          onConfirmApproval ? onConfirmApproval(approvalProposal) : onCloseApproval()
        }
        onClose={onCloseApproval}
        onDismiss={onDismissApproval ? () => onDismissApproval(approvalProposal) : undefined}
      />
    ) : null}

    {action === 'assign' && recordId ? (
      <AssignActionModal
        recordId={recordId}
        initialAssignee={initialAssignee}
        onClose={onCloseAction}
        // TODO: use assign action API call hook
        onAssign={onCloseAction}
      />
    ) : null}

    {action === 'close' && recordId
      ? renderDismissModal?.({ recordId, onClose: onCloseAction }) ?? (
          <BaseActionModal
            type="dismiss"
            title={MODAL_TRANSLATIONS.dismiss.title}
            recordId={recordId}
            onClose={onCloseAction}
            rationalePlaceholder={MODAL_TRANSLATIONS.dismiss.rationalePlaceholder}
            primaryAction={{
              color: 'danger',
              label: MODAL_TRANSLATIONS.dismiss.actionButtonLabel,
              // TODO: use dismiss action API call hook
              onClick: onCloseAction,
            }}
          />
        )
      : null}
  </>
);
