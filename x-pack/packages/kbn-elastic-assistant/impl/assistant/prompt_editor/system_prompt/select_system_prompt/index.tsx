/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSuperSelect,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { Conversation } from '../../../../..';
import { getOptions } from '../helpers';
import * as i18n from '../translations';
import type { Prompt } from '../../../types';
import { useAssistantContext } from '../../../../assistant_context';
import { useConversation } from '../../../use_conversation';
import { SYSTEM_PROMPTS_TAB } from '../../../settings/assistant_settings';

export interface Props {
  compressed?: boolean;
  conversation: Conversation | undefined;
  selectedPrompt: Prompt | undefined;
  clearSelectedSystemPrompt?: () => void;
  isClearable?: boolean;
  isEditing?: boolean;
  isOpen?: boolean;
  setIsEditing?: React.Dispatch<React.SetStateAction<boolean>>;
  showTitles?: boolean;
}

const ADD_NEW_SYSTEM_PROMPT = 'ADD_NEW_SYSTEM_PROMPT';

const SelectSystemPromptComponent: React.FC<Props> = ({
  compressed = false,
  conversation,
  selectedPrompt,
  clearSelectedSystemPrompt,
  isClearable = false,
  isEditing = false,
  isOpen = false,
  setIsEditing,
  showTitles = false,
}) => {
  const {
    allSystemPrompts,
    isSettingsModalVisible,
    setIsSettingsModalVisible,
    setSelectedSettingsTab,
  } = useAssistantContext();
  const { setApiConfig } = useConversation();

  const [isOpenLocal, setIsOpenLocal] = useState<boolean>(isOpen);
  const handleOnBlur = useCallback(() => setIsOpenLocal(false), []);

  // Write the selected system prompt to the conversation config
  const setSelectedSystemPrompt = useCallback(
    (prompt: Prompt | undefined) => {
      if (conversation) {
        setApiConfig({
          conversationId: conversation.id,
          apiConfig: {
            ...conversation.apiConfig,
            defaultSystemPrompt: prompt,
          },
        });
      }
    },
    [conversation, setApiConfig]
  );

  const addNewSystemPrompt = useMemo(() => {
    return {
      value: ADD_NEW_SYSTEM_PROMPT,
      inputDisplay: i18n.ADD_NEW_SYSTEM_PROMPT,
      dropdownDisplay: (
        <EuiFlexGroup gutterSize="none" key={ADD_NEW_SYSTEM_PROMPT}>
          <EuiFlexItem grow={true}>
            <EuiButtonEmpty iconType="plus" size="xs">
              {i18n.ADD_NEW_SYSTEM_PROMPT}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {/* Right offset to compensate for 'selected' icon of EuiSuperSelect since native footers aren't supported*/}
            <div style={{ width: '24px' }} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    };
  }, []);

  // SuperSelect State/Actions
  const options = useMemo(
    () => getOptions({ prompts: allSystemPrompts, showTitles }),
    [allSystemPrompts, showTitles]
  );
  const onChange = useCallback(
    (selectedSystemPromptId) => {
      if (selectedSystemPromptId === ADD_NEW_SYSTEM_PROMPT) {
        setIsSettingsModalVisible(true);
        setSelectedSettingsTab(SYSTEM_PROMPTS_TAB);
        return;
      }
      setSelectedSystemPrompt(allSystemPrompts.find((sp) => sp.id === selectedSystemPromptId));
      setIsEditing?.(false);
    },
    [
      allSystemPrompts,
      setIsEditing,
      setIsSettingsModalVisible,
      setSelectedSettingsTab,
      setSelectedSystemPrompt,
    ]
  );

  const clearSystemPrompt = useCallback(() => {
    setSelectedSystemPrompt(undefined);
    setIsEditing?.(false);
    clearSelectedSystemPrompt?.();
  }, [clearSelectedSystemPrompt, setIsEditing, setSelectedSystemPrompt]);

  const onShowSelectSystemPrompt = useCallback(() => {
    setIsEditing?.(true);
    setIsOpenLocal(true);
  }, [setIsEditing]);

  return (
    <EuiFlexGroup data-test-subj="selectSystemPrompt" gutterSize="none">
      <EuiFlexItem
        css={css`
          max-width: 100%;
        `}
      >
        {isEditing && (
          <EuiFormRow
            css={css`
              min-width: 100%;
            `}
          >
            <EuiSuperSelect
              compressed={compressed}
              data-test-subj="promptSuperSelect"
              fullWidth
              hasDividers
              itemLayoutAlign="top"
              isOpen={isOpenLocal && !isSettingsModalVisible}
              onChange={onChange}
              onBlur={handleOnBlur}
              options={[...options, addNewSystemPrompt]}
              placeholder={i18n.SELECT_A_SYSTEM_PROMPT}
              valueOfSelected={selectedPrompt?.id}
            />
          </EuiFormRow>
        )}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {isEditing && isClearable && (
          <EuiToolTip content={i18n.CLEAR_SYSTEM_PROMPT}>
            <EuiButtonIcon
              aria-label={i18n.CLEAR_SYSTEM_PROMPT}
              data-test-subj="clearSystemPrompt"
              iconType="cross"
              onClick={clearSystemPrompt}
            />
          </EuiToolTip>
        )}
        {!isEditing && (
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
