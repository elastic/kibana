/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Investigation } from '../../types';
import { BaseActions, type CardActionType } from '../actions';
import {
  InvestigationActionModals,
  type EscalationModalRenderProps,
} from '../modals/investigation_action_modals';
import { DETAILS_FLYOUT_LABELS } from './translations';

export interface ConversationDetailsFlyoutFooterProps {
  investigation: Investigation;
  /** Supplied by the caller because flyout slots render outside a `KibanaContextProvider`. */
  onOpenChat: () => void;
  /**
   * When provided, the "Open an escalation" item in the actions menu opens the escalation modal.
   * Supplied by the caller who has access to Kibana HTTP hooks unavailable in this package.
   */
  onOpenEscalation?: (props: EscalationModalRenderProps) => React.ReactNode;
}

interface ModalState {
  type: CardActionType | null;
  recordId: Investigation['recordId'] | null;
}

const CLOSED_MODAL: ModalState = { type: null, recordId: null };

/**
 * Footer slot content. It owns its action modals rather than delegating them upwards: the flyout
 * can be mounted through `core.overlays.openFlyout`, where there is no page-level React tree.
 */
export const ConversationDetailsFlyoutFooter = ({
  investigation,
  onOpenChat,
  onOpenEscalation,
}: ConversationDetailsFlyoutFooterProps) => {
  const [modalState, setModalState] = useState<ModalState>(CLOSED_MODAL);

  const closeModal = useCallback(() => setModalState(CLOSED_MODAL), []);

  const onClickAction = useCallback(
    (action: CardActionType, recordId: Investigation['recordId']) => {
      setModalState({ type: action, recordId });
    },
    []
  );

  return (
    <>
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="productAgent"
            onClick={onOpenChat}
            size="s"
            data-test-subj="investigationFlyoutOpenChat"
          >
            {DETAILS_FLYOUT_LABELS.actions.openChat}
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          {/* No `onClickRecommendedAction`: approving needs the proposal, and this footer is
              handed a conversation-derived investigation. Omitting it drops the menu entry
              rather than offering a decision this host cannot record. */}
          <BaseActions
            investigation={investigation}
            isFlyout={true}
            onClickAction={onClickAction}
            canManageEscalations={Boolean(onOpenEscalation)}
            data-test-subj="investigationFlyoutActions"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <InvestigationActionModals
        action={modalState.type}
        recordId={modalState.recordId}
        initialAssignee={investigation.assignee}
        investigation={investigation}
        onCloseAction={closeModal}
        onCloseApproval={closeModal}
        renderEscalationModal={onOpenEscalation}
      />
    </>
  );
};
