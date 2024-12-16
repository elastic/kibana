/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiLink } from '@elastic/eui';
import React, { useCallback, useMemo, useEffect } from 'react';
import { useAssistantContext } from '../..';

import { PromptContext } from '../assistant/prompt_context/types';
import { useAssistantOverlay } from '../assistant/use_assistant_overlay';

import * as i18n from './translations';

export type Props = Omit<PromptContext, 'id'> & {
  children?: React.ReactNode;
  /** Optionally automatically add this context to a conversation when the assistant is shown */
  conversationId?: string;
  /** Defaults to `discuss`. If null, the button will not have an icon. Not available for link */
  iconType?: string | null;
  /** Optionally specify a well known ID, or default to a UUID */
  promptContextId?: string;
  /** Optionally specify color of empty button */
  color?: 'text' | 'accent' | 'primary' | 'success' | 'warning' | 'danger';
  /** Required to identify the availability of the Assistant for the current license level */
  isAssistantEnabled: boolean;
  /** Optionally render new chat as a link */
  asLink?: boolean;
  /** Optional callback when overlay shows */
  onShowOverlay?: () => void;
  /** Optional callback that returns copied code block */
  onExportCodeBlock?: (codeBlock: string) => void;
};

const NewChatComponent: React.FC<Props> = ({
  category,
  color = 'primary',
  children = i18n.NEW_CHAT,
  conversationId,
  description,
  getPromptContext,
  iconType,
  promptContextId,
  suggestedUserPrompt,
  tooltip,
  isAssistantEnabled,
  asLink = false,
  onShowOverlay,
  onExportCodeBlock,
}) => {
  const { showAssistantOverlay } = useAssistantOverlay(
    category,
    conversationId ?? null,
    description,
    getPromptContext,
    promptContextId ?? null,
    suggestedUserPrompt,
    tooltip,
    isAssistantEnabled
  );
  const { codeBlockRef } = useAssistantContext();

  const showOverlay = useCallback(() => {
    showAssistantOverlay(true);
    onShowOverlay?.();
  }, [showAssistantOverlay, onShowOverlay]);

  useEffect(() => {
    if (onExportCodeBlock) {
      codeBlockRef.current = onExportCodeBlock;
    }

    return () => {
      if (onExportCodeBlock) {
        codeBlockRef.current = () => {};
      }
    };
  }, [codeBlockRef, onExportCodeBlock]);

  const icon = useMemo(() => {
    if (iconType === null) {
      return undefined;
    }

    return iconType ?? 'discuss';
  }, [iconType]);

  return useMemo(
    () =>
      asLink ? (
        <EuiLink color={color} data-test-subj="newChatLink" onClick={showOverlay}>
          {children}
        </EuiLink>
      ) : (
        <EuiButtonEmpty
          color={color}
          data-test-subj="newChat"
          onClick={showOverlay}
          iconType={icon}
        >
          {children}
        </EuiButtonEmpty>
      ),
    [children, icon, showOverlay, color, asLink]
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
