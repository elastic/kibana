/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { AiButtonEmpty } from '@kbn/ui-ai-components';
import type { Investigation } from '../../types';
import { type CardActionType } from '../actions';
import {
  InvestigationActionModals,
  type EscalationModalRenderProps,
} from '../modals/investigation_action_modals';
import { DETAILS_FLYOUT_LABELS } from './translations';
import { ACTIONS_TRANSLATIONS } from '../actions/translations';

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
  const canRenderEscalationButton = Boolean(onOpenEscalation);

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
          <AiButtonEmpty
            size="s"
            iconType="productAgent"
            onClick={onOpenChat}
            data-test-subj="investigationFlyoutOpenChat"
          >
            {DETAILS_FLYOUT_LABELS.actions.openChat}
          </AiButtonEmpty>
        </EuiFlexItem>

        {canRenderEscalationButton && (
          <EuiFlexItem grow={false}>
            <EuiButton
              color="primary"
              iconType="document"
              onClick={() => onClickAction('createEscalation', investigation.recordId)}
              size="s"
            >
              {ACTIONS_TRANSLATIONS.buttons.openEscalation}
            </EuiButton>
          </EuiFlexItem>
        )}
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
