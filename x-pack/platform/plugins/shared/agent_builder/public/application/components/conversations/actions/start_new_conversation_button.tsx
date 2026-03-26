/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';

const NEW_CONVERSATION_BUTTON_LABEL = i18n.translate(
  'xpack.agentBuilder.appError.startNewConversationButtonLabel',
  {
    defaultMessage: 'Start new conversation',
  }
);

const NEW_CONVERSATION_PATH = appPaths.chat.new;

export const StartNewConversationButton: React.FC = () => {
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { isEmbeddedContext, setConversationId } = useConversationContext();

  const handleClick = useCallback(() => {
    if (isEmbeddedContext) {
      setConversationId?.(undefined);
    } else {
      navigateToAgentBuilderUrl(NEW_CONVERSATION_PATH);
    }
  }, [isEmbeddedContext, setConversationId, navigateToAgentBuilderUrl]);

  return (
    <EuiButton
      color="primary"
      fill
      onClick={handleClick}
      data-test-subj="startNewConversationButton"
    >
      {NEW_CONVERSATION_BUTTON_LABEL}
    </EuiButton>
  );
};
