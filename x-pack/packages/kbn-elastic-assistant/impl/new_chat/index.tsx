/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { PromptContext } from '../assistant/prompt_context/types';
import { useAssistantOverlay } from '../assistant/use_assistant_overlay';

import * as i18n from './translations';

export type Props = Omit<PromptContext, 'id'> & {
  children?: React.ReactNode;
  /** Optionally automatically add this context to a conversation when the assistant is shown */
  conversationId?: string;
  /** Defaults to `discuss`. If null, the button will not have an icon */
  iconType?: string | null;
  /** Optionally specify a well known ID, or default to a UUID */
  promptContextId?: string;
};

const NewChatComponent: React.FC<Props> = ({
  category,
  children = i18n.NEW_CHAT,
  conversationId,
  description,
  getPromptContext,
  iconType,
  promptContextId,
  suggestedUserPrompt,
  tooltip,
}) => {
  const { showAssistantOverlay } = useAssistantOverlay(
    category,
    conversationId ?? null,
    description,
    getPromptContext,
    promptContextId ?? null,
    suggestedUserPrompt,
    tooltip
  );

  const showOverlay = useCallback(() => {
    showAssistantOverlay(true);
  }, [showAssistantOverlay]);

  const icon = useMemo(() => {
    if (iconType === null) {
      return undefined;
    }

    return iconType ?? 'discuss';
  }, [iconType]);

  return useMemo(
    () => (
      <EuiButtonEmpty data-test-subj="newChat" onClick={showOverlay} iconType={icon}>
        {children}
      </EuiButtonEmpty>
    ),
    [children, icon, showOverlay]
  );
};

NewChatComponent.displayName = 'NewChatComponent';

/**
 * `NewChat` displays a _New chat_ icon button, providing all the context
 * necessary to start a new chat. You may optionally style the button icon,
 * or override the default _New chat_ text with custom content, like `🪄✨`
 *
 * USE THIS WHEN: All the data necessary to start a new chat is available
 * in the same part of the React tree as the _New chat_ button.
 */
export const NewChat = React.memo(NewChatComponent);
