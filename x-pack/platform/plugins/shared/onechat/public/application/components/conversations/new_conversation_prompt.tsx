/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { css } from '@emotion/css';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTextArea,
  EuiButtonIcon,
  useEuiTheme,
  keys,
} from '@elastic/eui';
import { chatCommonLabels } from './i18n';

interface NewConversationPromptProps {
  onSubmit: (message: string) => void;
}

export const NewConversationPrompt: React.FC<NewConversationPromptProps> = ({ onSubmit }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState<string>('');
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
  }, [inputRef]);

  const containerClass = css`
    width: 100%;
    max-width: 600px;
  `;

  const inputContainerClass = css`
    padding-top: ${euiTheme.size.l};
    width: 100%;
  `;

  const inputFlexItemClass = css`
    max-width: 900px;
  `;

  const handleSubmit = useCallback(() => {
    if (!message.trim()) {
      return;
    }

    onSubmit(message);
    setMessage('');
  }, [message, onSubmit]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.currentTarget.value);
  }, []);

  const handleTextAreaKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!event.shiftKey && event.key === keys.ENTER) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <EuiFlexGroup alignItems="center" justifyContent="center">
      <EuiFlexItem grow={false} className={containerClass}>
        <EuiPanel hasBorder={true} hasShadow={false} borderRadius="none" paddingSize="xl">
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            alignItems="center"
            justifyContent="center"
          >
            <EuiFlexItem className={inputContainerClass}>
              <EuiFlexGroup
                gutterSize="s"
                responsive={false}
                alignItems="center"
                justifyContent="center"
              >
                <EuiFlexItem className={inputFlexItemClass}>
                  <EuiTextArea
                    inputRef={inputRef}
                    data-test-subj="onechatAppChatNewConvTextArea"
                    fullWidth
                    rows={1}
                    resize="vertical"
                    value={message}
                    onChange={handleChange}
                    onKeyDown={handleTextAreaKeyDown}
                    placeholder={chatCommonLabels.userInputBox.placeholder}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    aria-label="Submit"
                    data-test-subj="onechatAppChatNewConvSubmitButton"
                    iconType="kqlFunction"
                    display="fill"
                    size="m"
                    onClick={handleSubmit}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
