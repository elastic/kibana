/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConversationContext } from '../../context/conversation/conversation_context';
import { PromptLayout } from './prompt_layout';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';

export type AppErrorType = 'GENERIC_ERROR' | 'CONVERSATION_NOT_FOUND';

interface ErrorDetails {
  title: string;
  description: string;
  icon: string;
}

const ERROR_DETAILS_MAPPINGS: Record<AppErrorType, ErrorDetails> = {
  GENERIC_ERROR: {
    title: i18n.translate('xpack.agentBuilder.appError.genericErrorTitle', {
      defaultMessage: 'Something didn’t work',
    }),
    description: i18n.translate('xpack.agentBuilder.appError.genericErrorDescription', {
      defaultMessage:
        'We ran into an issue while running this request. Try again or start a new conversation.',
    }),
    icon: 'warning',
  },
  CONVERSATION_NOT_FOUND: {
    title: i18n.translate('xpack.agentBuilder.appError.conversationNotFoundErrorTitle', {
      defaultMessage: 'Conversation not found',
    }),
    description: i18n.translate(
      'xpack.agentBuilder.appError.conversationNotFoundErrorDescription',
      {
        defaultMessage:
          "The conversation ID in the URL doesn't exist. Browse your previous conversations or start a new one.",
      }
    ),
    icon: 'search',
  },
};

const NEW_CONVERSATION_BUTTON_LABEL = i18n.translate(
  'xpack.agentBuilder.appError.startNewConversationButtonLabel',
  {
    defaultMessage: 'Start new conversation',
  }
);

interface AppErrorPromptProps {
  errorType: AppErrorType;
}

const StartNewConversationAction: React.FC = () => {
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { isEmbeddedContext, setConversationId } = useConversationContext();

  const handleClick = useCallback(() => {
    if (isEmbeddedContext) {
      setConversationId?.(undefined);
    } else {
      navigateToAgentBuilderUrl(appPaths.chat.new);
    }
  }, [isEmbeddedContext, setConversationId, navigateToAgentBuilderUrl]);

  return (
    <EuiButton color="primary" fill onClick={handleClick}>
      {NEW_CONVERSATION_BUTTON_LABEL}
    </EuiButton>
  );
};

export const getErrorTypeFromStatus = (status?: number): AppErrorType => {
  if (status === 404) {
    return 'CONVERSATION_NOT_FOUND';
  }
  return 'GENERIC_ERROR';
};

export const AppErrorPrompt: React.FC<AppErrorPromptProps> = ({ errorType }) => {
  const { isEmbeddedContext } = useConversationContext();
  const errorDetails = ERROR_DETAILS_MAPPINGS[errorType];

  return (
    <PromptLayout
      variant={isEmbeddedContext ? 'embeddable' : 'default'}
      iconType={errorDetails.icon}
      title={errorDetails.title}
      subtitle={errorDetails.description}
      primaryButton={<StartNewConversationAction />}
    />
  );
};
