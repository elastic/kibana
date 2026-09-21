/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Investigation } from '../../types';
import type { CardActionType } from '../actions/base_actions';
import type { EscalationModalMode } from './escalation_modal/types';
import { AssignActionModal } from './assign_action_modal';
import { BaseActionModal } from './base_action_modal';
import { ApprovalModal } from './approval_modal/approval_modal';
import { MODAL_TRANSLATIONS } from './translations';

export interface EscalationModalRenderProps {
  mode: EscalationModalMode;
  investigation: Investigation;
  onClose: () => void;
}

export interface InvestigationActionModalsProps {
  /** Action awaiting confirmation, or `null` when no action modal is open. */
  action: CardActionType | null;
  recordId: Investigation['recordId'] | null;
  initialAssignee?: string | null;
  /** Full investigation for actions that need more than recordId (e.g. escalation). */
  investigation?: Investigation;
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
   * Replaces the default rationale-only dismiss modal. Supplied when a solution's
   * dismissal captures more than a rationale — a structured reason, say — which changes
   * what the modal renders and what local state it owns, not just what confirming does.
   */
  renderDismissModal?: (props: { recordId: string; onClose: () => void }) => React.ReactNode;
  /**
   * Renders the escalation modal when an 'openIncident' or 'attachToIncident' action is
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
export const InvestigationActionModals = ({
  action,
  recordId,
  initialAssignee,
  investigation,
  approvalInvestigation,
  onCloseAction,
  onCloseApproval,
  onConfirmApproval,
  renderDismissModal,
  renderEscalationModal,
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

    {(action === 'openIncident' || action === 'attachToIncident') && investigation
      ? renderEscalationModal?.({
          mode: action === 'openIncident' ? 'create' : 'addToExisting',
          investigation,
          onClose: onCloseAction,
        }) ?? null
      : null}
  </>
);
