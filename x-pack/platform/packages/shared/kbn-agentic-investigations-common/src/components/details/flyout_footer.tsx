/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { AiButtonEmpty } from '@kbn/ui-ai-components';
import { useCaseBridge, useInvestigationCaseId } from '../case_bridge/case_bridge_context';
import type { Investigation } from '../../types';
import { type CardActionType } from '../actions';
import {
  InvestigationActionModals,
  type CloseInvestigationModalRenderProps,
  type EscalationModalRenderProps,
} from '../modals/investigation_action_modals';
import { DETAILS_FLYOUT_LABELS } from './translations';
import { ACTIONS_TRANSLATIONS } from '../actions/translations';

export type { CloseInvestigationModalRenderProps };

export interface ConversationDetailsFlyoutFooterProps {
  isOpenedFromChat: boolean;
  investigation: Investigation;
  /** Supplied by the caller because flyout slots render outside a `KibanaContextProvider`. */
  onOpenChat: () => void;
  /**
   * When provided, the "Open an escalation" item in the actions menu opens the escalation modal.
   * Supplied by the caller who has access to Kibana HTTP hooks unavailable in this package.
   */
  onOpenEscalation?: (props: EscalationModalRenderProps) => React.ReactNode;
  /**
   * Wraps the "Open escalation" button, so the caller can hide it once it learns at render time
   * that the user may not escalate. Without it the button shows whenever `onOpenEscalation` is
   * supplied.
   */
  wrapEscalationButton?: (button: React.ReactElement) => React.ReactNode;
  /**
   * When provided, the "Close investigation" action renders a confirmation modal.
   * Supplied by the caller so the modal can use HTTP hooks unavailable in this package.
   */
  onCloseInvestigation?: (props: CloseInvestigationModalRenderProps) => React.ReactNode;
}

/**
 * Footer slot content. It owns its action modals rather than delegating them upwards: the flyout
 * can be mounted through `core.overlays.openFlyout`, where there is no page-level React tree.
 */
export const ConversationDetailsFlyoutFooter = ({
  isOpenedFromChat,
  investigation,
  onOpenChat,
  onOpenEscalation,
  wrapEscalationButton,
  onCloseInvestigation,
}: ConversationDetailsFlyoutFooterProps) => {
  const [modalAction, setModalAction] = useState<CardActionType | null>(null);
  const closeModal = useCallback(() => setModalAction(null), []);
  const caseBridge = useCaseBridge();
  const caseId = useInvestigationCaseId(investigation);
  const canRenderEscalationButton = Boolean(onOpenEscalation) || Boolean(caseBridge && caseId);

  // With the cases bridge: View case once the investigation has one, Open a case before that.
  const escalationButton = (
    <EuiFlexItem grow={false}>
      {caseBridge && caseId ? (
        <EuiButton
          color="primary"
          iconType="casesApp"
          onClick={() => caseBridge.onViewCase(caseId)}
          size="s"
          data-test-subj="investigationFlyoutViewCase"
        >
          {ACTIONS_TRANSLATIONS.buttons.viewCase}
        </EuiButton>
      ) : (
        <EuiButton
          color="primary"
          iconType={caseBridge ? 'casesApp' : 'document'}
          onClick={() => setModalAction('createEscalation')}
          size="s"
          data-test-subj={caseBridge ? 'investigationFlyoutOpenCase' : undefined}
        >
          {caseBridge
            ? ACTIONS_TRANSLATIONS.buttons.openCase
            : ACTIONS_TRANSLATIONS.buttons.openEscalation}
        </EuiButton>
      )}
    </EuiFlexItem>
  );

  const renderCloseModal = onCloseInvestigation
    ? (props: CloseInvestigationModalRenderProps) => onCloseInvestigation(props)
    : undefined;

  return (
    <>
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" justifyContent="flexEnd">
        {!isOpenedFromChat && (
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
        )}
        {canRenderEscalationButton &&
          (wrapEscalationButton && !(caseBridge && caseId)
            ? wrapEscalationButton(escalationButton)
            : escalationButton)}
      </EuiFlexGroup>

      <InvestigationActionModals
        action={modalAction}
        investigation={investigation}
        onCloseAction={closeModal}
        onCloseApproval={closeModal}
        renderCloseModal={renderCloseModal}
        renderEscalationModal={onOpenEscalation}
      />
    </>
  );
};
