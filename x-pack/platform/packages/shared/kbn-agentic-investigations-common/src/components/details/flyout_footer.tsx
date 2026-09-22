/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import type { Investigation } from '../../types';
import { BaseActions, type CardActionType } from '../actions';
import { InvestigationActionModals } from '../modals/investigation_action_modals';
import { DETAILS_FLYOUT_LABELS } from './translations';

export interface ConversationDetailsFlyoutFooterProps {
  investigation: Investigation;
  /** Supplied by the caller because flyout slots render outside a `KibanaContextProvider`. */
  onOpenChat: () => void;
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
}: ConversationDetailsFlyoutFooterProps) => {
  const [modalState, setModalState] = useState<ModalState>(CLOSED_MODAL);
  const [isApprovalOpen, { on: openApproval, off: closeApproval }] = useBoolean();

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
          <BaseActions
            investigation={investigation}
            isFlyout={true}
            onClickAction={onClickAction}
            onClickRecommendedAction={openApproval}
            data-test-subj="investigationFlyoutActions"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <InvestigationActionModals
        action={modalState.type}
        recordId={modalState.recordId}
        initialAssignee={investigation.assignee}
        approvalInvestigation={isApprovalOpen ? investigation : undefined}
        onCloseAction={closeModal}
        onCloseApproval={closeApproval}
      />
    </>
  );
};
