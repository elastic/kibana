/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConversationContext } from '../../../../context/conversation/conversation_context';
import { EmbeddedActionsRight } from './embedded_actions_right';
import { FullScreenActionsRight } from './fullscreen_actions_right';

export interface ConversationRightActionsProps {
  onClose?: () => void;
}

export const ConversationRightActions: React.FC<ConversationRightActionsProps> = ({ onClose }) => {
  const { isEmbeddedContext } = useConversationContext();

  const labels = {
    container: i18n.translate('xpack.onechat.conversationActions.container', {
      defaultMessage: 'Conversation actions',
    }),
  };

  return (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="flexEnd"
      alignItems="center"
      aria-label={labels.container}
      responsive={false}
    >
      {isEmbeddedContext ? <EmbeddedActionsRight onClose={onClose} /> : <FullScreenActionsRight />}
    </EuiFlexGroup>
  );
};
