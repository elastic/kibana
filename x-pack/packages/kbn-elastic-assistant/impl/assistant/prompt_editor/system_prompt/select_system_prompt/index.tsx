/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSuperSelect,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { getOptions } from '../helpers';
import * as i18n from '../translations';
import type { Prompt } from '../../../types';

export interface Props {
  selectedPrompt: Prompt | undefined;
  setSelectedSystemPromptId: React.Dispatch<React.SetStateAction<string | null>>;
  setShowSelectSystemPrompt: React.Dispatch<React.SetStateAction<boolean>>;
  showSelectSystemPrompt: boolean;
  systemPrompts: Prompt[];
}

const SelectSystemPromptComponent: React.FC<Props> = ({
  selectedPrompt,
  setSelectedSystemPromptId,
  setShowSelectSystemPrompt,
  showSelectSystemPrompt,
  systemPrompts,
}) => {
  const options = useMemo(() => getOptions(systemPrompts), [systemPrompts]);

  const onChange = useCallback(
    (value) => {
      setSelectedSystemPromptId(value);
      setShowSelectSystemPrompt(false);
    },
    [setSelectedSystemPromptId, setShowSelectSystemPrompt]
  );

  const clearSystemPrompt = useCallback(() => {
    setSelectedSystemPromptId(null);
    setShowSelectSystemPrompt(false);
  }, [setSelectedSystemPromptId, setShowSelectSystemPrompt]);

  const onShowSelectSystemPrompt = useCallback(
    () => setShowSelectSystemPrompt(true),
    [setShowSelectSystemPrompt]
  );

  return (
    <EuiFlexGroup data-test-subj="selectSystemPrompt" gutterSize="none">
      <EuiFlexItem>
        {showSelectSystemPrompt && (
          <EuiFormRow
            css={css`
              min-width: 100%;
            `}
          >
            <EuiSuperSelect
              data-test-subj="promptSuperSelect"
              fullWidth={true}
              hasDividers
              itemLayoutAlign="top"
              onChange={onChange}
              options={options}
              placeholder={i18n.SELECT_A_SYSTEM_PROMPT}
              valueOfSelected={selectedPrompt?.id}
            />
          </EuiFormRow>
        )}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {showSelectSystemPrompt ? (
          <EuiToolTip content={i18n.CLEAR_SYSTEM_PROMPT}>
            <EuiButtonIcon
              aria-label={i18n.CLEAR_SYSTEM_PROMPT}
              data-test-subj="clearSystemPrompt"
              iconType="cross"
              onClick={clearSystemPrompt}
            />
          </EuiToolTip>
        ) : (
          <EuiToolTip content={i18n.ADD_SYSTEM_PROMPT_TOOLTIP}>
            <EuiButtonIcon
              aria-label={i18n.ADD_SYSTEM_PROMPT_TOOLTIP}
              data-test-subj="addSystemPrompt"
              iconType="plus"
              onClick={onShowSelectSystemPrompt}
            />
          </EuiToolTip>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SelectSystemPromptComponent.displayName = 'SelectSystemPromptComponent';

export const SelectSystemPrompt = React.memo(SelectSystemPromptComponent);
