/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PromptLayout, PROMPT_LAYOUT_VARIANTS, type PromptLayoutVariant } from './layout';

export type ErrorPromptType =
  | 'GENERIC_ERROR'
  | 'CONVERSATION_NOT_FOUND'
  | 'MISSING_PRIVILEGES'
  | 'UPGRADE_LICENSE'
  | 'ADD_LLM_CONNECTION';

interface ErrorDetails {
  title: string;
  description: string;
  icon?: IconType;
}

const ERROR_DETAILS_MAPPINGS: Record<ErrorPromptType, ErrorDetails> = {
  GENERIC_ERROR: {
    title: i18n.translate('xpack.agentBuilder.errorPrompt.genericErrorTitle', {
      defaultMessage: 'Something didn’t work',
    }),
    description: i18n.translate('xpack.agentBuilder.errorPrompt.genericErrorDescription', {
      defaultMessage:
        'We ran into an issue while running this request. Try again or start a new conversation.',
    }),
    icon: 'warning',
  },
  CONVERSATION_NOT_FOUND: {
    title: i18n.translate('xpack.agentBuilder.errorPrompt.conversationNotFoundErrorTitle', {
      defaultMessage: 'Conversation not found',
    }),
    description: i18n.translate(
      'xpack.agentBuilder.errorPrompt.conversationNotFoundErrorDescription',
      {
        defaultMessage:
          "The conversation ID in the URL doesn't exist. Browse your previous conversations or start a new one.",
      }
    ),
    icon: 'search',
  },
  MISSING_PRIVILEGES: {
    title: i18n.translate('xpack.agentBuilder.access.prompt.noPrivilege.title', {
      defaultMessage: 'Access denied',
    }),
    description: i18n.translate('xpack.agentBuilder.access.prompt.noPrivilege.description', {
      defaultMessage:
        "You don't have the required privileges to access the Agent Builder. Please contact your administrator.",
    }),
  },
  UPGRADE_LICENSE: {
    title: i18n.translate('xpack.agentBuilder.access.prompt.upgradeLicense.title', {
      defaultMessage: 'Upgrade your cluster license',
    }),
    description: i18n.translate('xpack.agentBuilder.access.prompt.upgradeLicense.description', {
      defaultMessage: 'Your cluster needs an Enterprise license to use the Elastic Agent Builder.',
    }),
  },
  ADD_LLM_CONNECTION: {
    title: i18n.translate('xpack.agentBuilder.access.prompt.addLlm.title', {
      defaultMessage: 'No Large Language Model detected',
    }),
    description: i18n.translate('xpack.agentBuilder.access.prompt.addLlm.description', {
      defaultMessage:
        'Select a model to integrate with your chat experience. You can also set up your connection.',
    }),
  },
};

interface ErrorPromptProps {
  errorType: ErrorPromptType;
  imageSrc?: string;
  primaryButton: React.ReactNode;
  secondaryButton?: React.ReactNode;
  variant?: PromptLayoutVariant;
}

export const ErrorPrompt: React.FC<ErrorPromptProps> = ({
  errorType,
  imageSrc,
  primaryButton,
  secondaryButton,
  variant = PROMPT_LAYOUT_VARIANTS.DEFAULT,
}) => {
  const errorDetails = ERROR_DETAILS_MAPPINGS[errorType];

  return (
    <PromptLayout
      variant={variant}
      iconType={errorDetails.icon}
      imageSrc={imageSrc}
      title={errorDetails.title}
      subtitle={errorDetails.description}
      primaryButton={primaryButton}
      secondaryButton={secondaryButton ?? null}
    />
  );
};
