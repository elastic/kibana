/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { useNavigation } from '../../../hooks/use_navigation';
import { useLastAgentId } from '../../../hooks/use_last_agent_id';
import { appPaths } from '../../../utils/app_paths';

const NEW_CONVERSATION_BUTTON_LABEL = i18n.translate(
  'xpack.agentBuilder.appError.startNewConversationButtonLabel',
  {
    defaultMessage: 'Start new conversation',
  }
);

export const StartNewConversationButton: React.FC = () => {
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { isEmbeddedContext, setConversationId, resetAttachments, resetInputMessage } =
    useConversationContext();
  const { removeError } = useConversationStream();
  const lastAgentId = useLastAgentId();

  const handleClick = useCallback(() => {
    if (isEmbeddedContext) {
      removeError();
      setConversationId?.(undefined);
      resetAttachments?.();
      resetInputMessage?.();
    } else {
      navigateToAgentBuilderUrl(appPaths.agent.conversations.new({ agentId: lastAgentId }));
    }
  }, [
    isEmbeddedContext,
    removeError,
    setConversationId,
    resetAttachments,
    resetInputMessage,
    navigateToAgentBuilderUrl,
    lastAgentId,
  ]);

  return (
    <EuiButton
      color="primary"
      fill
      onClick={handleClick}
      data-test-subj="startNewConversationButton"
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.conversation.START_NEW,
        detail: 'conversation',
      })}
    >
      {NEW_CONVERSATION_BUTTON_LABEL}
    </EuiButton>
  );
};
