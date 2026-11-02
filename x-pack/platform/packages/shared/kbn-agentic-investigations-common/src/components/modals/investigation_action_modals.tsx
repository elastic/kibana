/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ApprovalModal } from '@kbn/proposals-ui';
import type { ApprovalProposal, DeclineParams } from '@kbn/proposals-ui';
import type { Investigation } from '../../types';
import type { CardActionType } from '../actions/base_actions';
import type { EscalationModalMode } from './escalation_modal/types';

export interface CloseInvestigationModalRenderProps {
  /** The investigation being closed. Used to access `conversationId` and `status`. */
  investigation: Investigation;
  onClose: () => void;
}

export interface EscalationModalRenderProps {
  mode: EscalationModalMode;
  investigation: Investigation;
  onClose: () => void;
}

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
  /** The investigation the action applies to. The close and escalation modals need it. */
  investigation?: Investigation;
  /** Proposal awaiting a decision, if any. */
  approvalProposal?: TProposal;
  onCloseAction: () => void;
  /** Closes the approval modal. Needed by hosts that pass `approvalProposal`. */
  onCloseApproval?: () => void;
  /**
   * Commits the approval. Receives the proposal rather than closing over it, so a caller's
   * handler stays referentially stable across renders. Falls back to closing the modal, so a
   * host that opens one with no mutation to call cannot leave it stuck open.
   */
  onConfirmApproval?: (proposal: TProposal) => Promise<void>;
  readOnly?: boolean;
  /**
   * Records a dismissal from the approval modal, with its structured reason. Awaited by the
   * modal — same contract as `onConfirmApproval` — so a rejection surfaces in its own error
   * banner. Omitted by hosts that cannot capture one, which also hides the Decline button rather
   * than leaving it inert.
   */
  onDismissApproval?: (proposal: TProposal, params: DeclineParams) => Promise<void>;
  /**
   * Whether `approvalProposal`'s approve/decline is currently in flight. Sourced from the host's
   * own mutation cache (e.g. `useIsMutating`), so this modal agrees with anything else showing the
   * same proposal and survives being closed and reopened mid-submission.
   */
  isSubmitting?: 'applying' | 'declining';
  /** Who's approving, for the modal's "Applying"/"Declining" caption. */
  currentActorName?: string;
  /**
   * Renders the close-investigation confirmation modal for the 'close' action.
   * Receives the full investigation so the modal can key on `conversationId` rather than
   * `recordId` (which is the proposal id and is undefined in the flyout context).
   */
  renderCloseModal?: (props: CloseInvestigationModalRenderProps) => React.ReactNode;
  /**
   * Renders the escalation modal when a 'createEscalation' or 'attachToEscalation' action is
   * triggered. Provided by the caller so the modal can use Kibana HTTP hooks that are not
   * available in this package.
   */
  renderEscalationModal?: (props: EscalationModalRenderProps) => React.ReactNode;
}

/**
 * The action modals an investigation can raise.
 *
 * Rendered by whichever tree owns the trigger: the queue page for card actions, and the flyout
 * footer for its own, since the registry flyout mounts outside the page's React tree.
 */
export const InvestigationActionModals = <TProposal extends ApprovalProposal = ApprovalProposal>({
  action,
  investigation,
  approvalProposal,
  readOnly,
  onCloseAction,
  onCloseApproval,
  onConfirmApproval,
  onDismissApproval,
  renderCloseModal,
  renderEscalationModal,
  isSubmitting,
  currentActorName,
}: InvestigationActionModalsProps<TProposal>) => (
  <>
    {approvalProposal && onCloseApproval ? (
      <ApprovalModal
        proposal={approvalProposal}
        readOnly={readOnly}
        onConfirm={async () => {
          if (onConfirmApproval) {
            await onConfirmApproval(approvalProposal);
          } else {
            onCloseApproval();
          }
        }}
        onClose={onCloseApproval}
        onDismiss={
          onDismissApproval ? (params) => onDismissApproval(approvalProposal, params) : undefined
        }
        isSubmitting={isSubmitting}
        currentActorName={currentActorName}
      />
    ) : null}

    {action === 'close' && renderCloseModal && investigation
      ? renderCloseModal({ investigation, onClose: onCloseAction })
      : null}

    {(action === 'createEscalation' || action === 'attachToEscalation') && investigation
      ? renderEscalationModal?.({
          mode: action === 'createEscalation' ? 'create' : 'addToExisting',
          investigation,
          onClose: onCloseAction,
        }) ?? null
      : null}
  </>
);
