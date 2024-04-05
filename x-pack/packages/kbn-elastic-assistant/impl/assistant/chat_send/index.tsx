/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { UseChatSend } from './use_chat_send';
import { ChatActions } from '../chat_actions';
import { PromptTextArea } from '../prompt_textarea';
import { useAutosizeTextArea } from './use_autosize_textarea';

export interface Props extends Omit<UseChatSend, 'abortStream'> {
  isDisabled: boolean;
  shouldRefocusPrompt: boolean;
  userPrompt: string | null;
  isFlyoutMode: boolean;
}

/**
 * Renders the user input prompt text area.
 * Allows the user to clear the chat and switch between different system prompts.
 */
export const ChatSend: React.FC<Props> = ({
  handleButtonSendMessage,
  handleOnChatCleared,
  handlePromptChange,
  handleSendMessage,
  isDisabled,
  isLoading,
  isFlyoutMode,
  shouldRefocusPrompt,
  userPrompt,
}) => {
  // For auto-focusing prompt within timeline
  const promptTextAreaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (shouldRefocusPrompt && promptTextAreaRef.current) {
      promptTextAreaRef?.current.focus();
    }
  }, [shouldRefocusPrompt]);
  const promptValue = useMemo(() => (isDisabled ? '' : userPrompt ?? ''), [isDisabled, userPrompt]);

  const onSendMessage = useCallback(() => {
    handleButtonSendMessage(promptTextAreaRef.current?.value?.trim() ?? '');
  }, [handleButtonSendMessage, promptTextAreaRef]);

  useAutosizeTextArea(promptTextAreaRef?.current, promptValue);

  return (
    <EuiFlexGroup
      gutterSize="none"
      alignItems={isFlyoutMode ? 'center' : 'flexStart'}
      css={css`
        position: relative;
      `}
    >
      <EuiFlexItem
        css={css`
          width: 100%;
        `}
      >
        <PromptTextArea
          onPromptSubmit={handleSendMessage}
          ref={promptTextAreaRef}
          handlePromptChange={handlePromptChange}
          value={promptValue}
          isDisabled={isDisabled}
          isFlyoutMode={isFlyoutMode}
        />
      </EuiFlexItem>
      <EuiFlexItem
        css={
          isFlyoutMode
            ? css`
                right: 0;
                position: absolute;
                margin-right: ${euiThemeVars.euiSizeS};
              `
            : css`
                left: -34px;
                position: relative;
                top: 11px;
              `
        }
        grow={false}
      >
        <ChatActions
          onChatCleared={handleOnChatCleared}
          isDisabled={isDisabled}
          isLoading={isLoading}
          onSendMessage={onSendMessage}
          isFlyoutMode={isFlyoutMode}
          promptValue={promptValue}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
