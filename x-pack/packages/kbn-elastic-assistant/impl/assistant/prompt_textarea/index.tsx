/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTextArea } from '@elastic/eui';
import React, { useCallback, forwardRef } from 'react';
import { css } from '@emotion/react';

import * as i18n from './translations';

export interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  handlePromptChange: (value: string) => void;
  isDisabled?: boolean;
  onPromptSubmit: (value: string) => void;
  value: string;
}

export const PromptTextArea = forwardRef<HTMLTextAreaElement, Props>(
  ({ isDisabled = false, value, onPromptSubmit, handlePromptChange }, ref) => {
    const onChangeCallback = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        handlePromptChange(event.target.value);
      },
      [handlePromptChange]
    );

    const onKeyDown = useCallback(
      (event) => {
        // keyCode 13 is needed in case of IME input
        if (event.keyCode === 13 && !event.shiftKey) {
          event.preventDefault();

          if (value.trim().length) {
            onPromptSubmit(event.target.value?.trim());
            handlePromptChange('');
          } else {
            event.stopPropagation();
          }
        }
      },
      [value, onPromptSubmit, handlePromptChange]
    );

    return (
      <EuiTextArea
        css={css`
          padding-right: 64px !important;
          min-height: 64px;
          max-height: 350px;
        `}
        className="eui-scrollBar"
        inputRef={ref}
        id={'prompt-textarea'}
        data-test-subj={'prompt-textarea'}
        fullWidth
        autoFocus
        resize="none"
        disabled={isDisabled}
        placeholder={i18n.PROMPT_PLACEHOLDER}
        value={value}
        onChange={onChangeCallback}
        onKeyDown={onKeyDown}
        rows={1}
      />
    );
  }
);
PromptTextArea.displayName = 'PromptTextArea';
