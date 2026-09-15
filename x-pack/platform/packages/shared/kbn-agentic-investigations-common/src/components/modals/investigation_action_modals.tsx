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
}: InvestigationActionModalsProps) => (
  <>
    {approvalInvestigation ? (
      <ApprovalModal
        selectedRecommendedActionConversation={approvalInvestigation}
        // TODO: use action API call hook
        onConfirm={onCloseApproval}
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

    {action === 'dismiss' && recordId ? (
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
    ) : null}
  </>
);
