/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTextArea } from '@elastic/eui';
import React, { useCallback, useEffect, forwardRef } from 'react';

// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';
import * as i18n from './translations';

export interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  handlePromptChange?: (value: string) => void;
  isDisabled?: boolean;
  onPromptSubmit: (value: string) => void;
  value: string;
}

const StyledTextArea = styled(EuiTextArea)`
  min-height: 125px;
`;

export const PromptTextArea = forwardRef<HTMLTextAreaElement, Props>(
  ({ isDisabled = false, value, onPromptSubmit, handlePromptChange, ...props }, ref) => {
    const [currentValue, setCurrentValue] = React.useState(value);

    const onChangeCallback = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCurrentValue(event.target.value);
        if (handlePromptChange) {
          handlePromptChange(event.target.value);
        }
      },
      [handlePromptChange]
    );

    const onKeyDown = useCallback(
      (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          onPromptSubmit(event.target.value?.trim());
          setCurrentValue('');
        }
      },
      [onPromptSubmit]
    );

    useEffect(() => {
      setCurrentValue(value);
      // TODO: Future bug either way :)
      // if (handlePromptChange) {
      //   handlePromptChange(value);
      // }
    }, [value]);

    return (
      <StyledTextArea
        className="eui-scrollBar"
        inputRef={ref}
        id={'prompt-textarea'}
        data-test-subj={'prompt-textarea'}
        fullWidth
        autoFocus
        disabled={isDisabled}
        placeholder={i18n.PROMPT_PLACEHOLDER}
        value={currentValue}
        onChange={onChangeCallback}
        onKeyDown={onKeyDown}
      />
    );
  }
);
PromptTextArea.displayName = 'PromptTextArea';
