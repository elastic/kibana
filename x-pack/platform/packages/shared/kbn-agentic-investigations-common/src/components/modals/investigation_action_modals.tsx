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
import { MODAL_TRANSLATIONS } from './translations';

export interface InvestigationActionModalsProps {
  /** Action awaiting confirmation, or `null` when no action modal is open. */
  action: CardActionType | null;
  recordId: Investigation['recordId'] | null;
  initialAssignee?: string | null;
  /** Investigation whose recommended action is awaiting approval, if any. */
  approvalInvestigation?: Investigation;
  onCloseAction: () => void;
  onCloseApproval: () => void;
  /**
   * Commits the approval. Receives the investigation rather than closing over it, so a
   * caller's handler stays referentially stable across renders.
   *
   * Defaults to closing the modal, which is what the flyout footer needs: it mounts
   * through `core.overlays.openFlyout`, outside the app's QueryClient, so it has no
   * mutation to call.
   */
  onConfirmApproval?: (investigation: Investigation) => void;
  /**
   * Commits the assignee update. Receives the chosen assignee and rationale, performs
   * the API call, and closes when done. Supplied by the solution layer which owns the
   * mutation hook; when absent the modal closes immediately without writing.
   */
  onAssignSubmit?: (assignee: string, rationale: string) => void;
  /**
   * Commits the investigation close. Receives the close reason, performs the API call,
   * and closes when done. Supplied by the solution layer which owns the mutation hook;
   * when absent the modal closes immediately without writing.
   */
  onCloseSubmit?: (closeReason: string) => void;
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
export const InvestigationActionModals = ({
  action,
  recordId,
  initialAssignee,
  approvalInvestigation,
  onCloseAction,
  onCloseApproval,
  onConfirmApproval,
  onAssignSubmit,
  onCloseSubmit,
  renderDismissModal,
}: InvestigationActionModalsProps) => (
  <>
    {approvalInvestigation ? (
      <ApprovalModal
        selectedRecommendedActionConversation={approvalInvestigation}
        onConfirm={() =>
          onConfirmApproval ? onConfirmApproval(approvalInvestigation) : onCloseApproval()
        }
        onClose={onCloseApproval}
      />
    ) : null}

    {action === 'assign' && recordId ? (
      <AssignActionModal
        recordId={recordId}
        initialAssignee={initialAssignee}
        onClose={onCloseAction}
        onAssign={onAssignSubmit ?? onCloseAction}
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
              onClick: onCloseSubmit ? () => onCloseSubmit('other') : onCloseAction,
            }}
          />
        )
      : null}
  </>
);
