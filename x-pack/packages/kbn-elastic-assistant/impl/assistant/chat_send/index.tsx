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

export interface Props extends Omit<UseChatSend, 'abortStream' | 'handleOnChatCleared'> {
  isDisabled: boolean;
  shouldRefocusPrompt: boolean;
  userPrompt: string | null;
}

/**
 * Renders the user input prompt text area.
 * Allows the user to clear the chat and switch between different system prompts.
 */
export const ChatSend: React.FC<Props> = ({
  setUserPrompt,
  handleChatSend,
  isDisabled,
  isLoading,
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
    handleChatSend(promptTextAreaRef.current?.value?.trim() ?? '');
    setUserPrompt('');
  }, [handleChatSend, promptTextAreaRef, setUserPrompt]);

  useAutosizeTextArea(promptTextAreaRef?.current, promptValue);

  useEffect(() => {
    setUserPrompt(promptValue);
  }, [setUserPrompt, promptValue]);

  return (
    <EuiFlexGroup
      gutterSize="none"
      alignItems={'flexEnd'}
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
          onPromptSubmit={handleChatSend}
          ref={promptTextAreaRef}
          setUserPrompt={setUserPrompt}
          value={promptValue}
          isDisabled={isDisabled}
        />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          right: 0;
          position: absolute;
          margin-right: ${euiThemeVars.euiSizeS};
          margin-bottom: ${euiThemeVars.euiSizeS};
        `}
        grow={false}
      >
        <ChatActions
          isDisabled={isDisabled}
          isLoading={isLoading}
          onSendMessage={onSendMessage}
          promptValue={promptValue}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
