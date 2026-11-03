/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AiButtonEmpty } from '@kbn/ui-ai-components';
import type { Investigation } from '../../types';
import type {
  CloseInvestigationModalRenderProps,
  EscalationModalRenderProps,
} from '../modals/investigation_action_modals';
import { DETAILS_FLYOUT_LABELS } from './translations';

export type { CloseInvestigationModalRenderProps };

export interface ConversationDetailsFlyoutFooterProps {
  isOpenedFromChat: boolean;
  investigation: Investigation;
  /** Supplied by the caller because flyout slots render outside a `KibanaContextProvider`. */
  onOpenChat: () => void;
  /**
   * Kept for callers that still wire escalation; the footer no longer shows "Open an escalation"
   * in technical preview (elastic/nightshift-program#2168).
   */
  onOpenEscalation?: (props: EscalationModalRenderProps) => React.ReactNode;
  /**
   * Kept for API compatibility; unused while the escalation footer button is hidden.
   */
  wrapEscalationButton?: (button: React.ReactElement) => React.ReactNode;
  /**
   * Kept for API compatibility with close-investigation wiring; unused in this footer today.
   */
  onCloseInvestigation?: (props: CloseInvestigationModalRenderProps) => React.ReactNode;
}

/**
 * Footer slot content for the investigation details flyout.
 */
export const ConversationDetailsFlyoutFooter = ({
  isOpenedFromChat,
  onOpenChat,
}: ConversationDetailsFlyoutFooterProps) => {
  return (
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
    </EuiFlexGroup>
  );
};
