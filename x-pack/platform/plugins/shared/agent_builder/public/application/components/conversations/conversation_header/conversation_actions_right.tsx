/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiTourStep } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { MoreActionsButton } from './more_actions_button';
import { CloseDockedViewButton } from './close_docked_view_button';
import { TourStep, useAgentBuilderTour } from '../../../context/agent_builder_tour_context';

const labels = {
  container: i18n.translate('xpack.agentBuilder.conversationActions.container', {
    defaultMessage: 'Conversation actions',
  }),
};

export interface ConversationRightActionsProps {
  onClose?: () => void;
  onRenameConversation: () => void;
}

export const ConversationRightActions: React.FC<ConversationRightActionsProps> = ({
  onClose,
  onRenameConversation,
}) => {
  const { isEmbeddedContext } = useConversationContext();

  const { getStepProps } = useAgentBuilderTour();

  return (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="flexEnd"
      alignItems="center"
      aria-label={labels.container}
      responsive={false}
    >
      <EuiTourStep {...getStepProps(TourStep.ConversationActions)}>
        <MoreActionsButton onRenameConversation={onRenameConversation} />
      </EuiTourStep>
      {isEmbeddedContext ? <CloseDockedViewButton onClose={onClose} /> : null}
    </EuiFlexGroup>
  );
};
