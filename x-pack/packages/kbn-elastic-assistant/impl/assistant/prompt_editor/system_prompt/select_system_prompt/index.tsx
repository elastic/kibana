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

import { euiThemeVars } from '@kbn/ui-theme';
import { Conversation } from '../../../../..';
import { getOptions } from '../helpers';
import * as i18n from '../translations';
import type { Prompt } from '../../../types';
import { useAssistantContext } from '../../../../assistant_context';
import { useConversation } from '../../../use_conversation';
import { SYSTEM_PROMPTS_TAB } from '../../../settings/assistant_settings';
import { TEST_IDS } from '../../../constants';

export interface Props {
  allSystemPrompts: Prompt[];
  compressed?: boolean;
  conversation?: Conversation;
  selectedPrompt: Prompt | undefined;
  clearSelectedSystemPrompt?: () => void;
  isClearable?: boolean;
  isEditing?: boolean;
  isDisabled?: boolean;
  isOpen?: boolean;
  isSettingsModalVisible: boolean;
  setIsEditing?: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  showTitles?: boolean;
  onSystemPromptSelectionChange?: (promptId: string | undefined) => void;
  isFlyoutMode: boolean;
}

const ADD_NEW_SYSTEM_PROMPT = 'ADD_NEW_SYSTEM_PROMPT';

const SelectSystemPromptComponent: React.FC<Props> = ({
  allSystemPrompts,
  compressed = false,
  conversation,
  selectedPrompt,
  clearSelectedSystemPrompt,
  isClearable = false,
  isEditing = false,
  isDisabled = false,
  isOpen = false,
  isSettingsModalVisible,
  onSystemPromptSelectionChange,
  setIsEditing,
  setIsSettingsModalVisible,
  showTitles = false,
  isFlyoutMode = false,
}) => {
  const { setSelectedSettingsTab } = useAssistantContext();
  const { setApiConfig } = useConversation();

  const [isOpenLocal, setIsOpenLocal] = useState<boolean>(isOpen);
  const [valueOfSelected, setValueOfSelected] = useState<string | undefined>(
    selectedPrompt?.id ?? allSystemPrompts?.[0]?.id
  );
  const handleOnBlur = useCallback(() => setIsOpenLocal(false), []);

  // Write the selected system prompt to the conversation config
  const setSelectedSystemPrompt = useCallback(
    (prompt: Prompt | undefined) => {
      if (conversation && conversation.apiConfig) {
        setApiConfig({
          conversation,
          apiConfig: {
            ...conversation.apiConfig,
            defaultSystemPromptId: prompt?.id,
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
            <EuiButtonEmpty href="#" iconType="plus" size="xs" data-test-subj="addSystemPrompt">
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
    () => getOptions({ prompts: allSystemPrompts, showTitles, isFlyoutMode }),
    [allSystemPrompts, showTitles, isFlyoutMode]
  );

  const onChange = useCallback(
    (selectedSystemPromptId) => {
      if (selectedSystemPromptId === ADD_NEW_SYSTEM_PROMPT) {
        setIsSettingsModalVisible(true);
        setSelectedSettingsTab(SYSTEM_PROMPTS_TAB);
        return;
      }
      // Note: if callback is provided, this component does not persist. Extract to separate component
      if (onSystemPromptSelectionChange != null) {
        onSystemPromptSelectionChange(selectedSystemPromptId);
      } else {
        setSelectedSystemPrompt(allSystemPrompts.find((sp) => sp.id === selectedSystemPromptId));
      }
      setValueOfSelected(selectedSystemPromptId);
      setIsEditing?.(false);
    },
    [
      allSystemPrompts,
      onSystemPromptSelectionChange,
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
    setValueOfSelected(undefined);
  }, [clearSelectedSystemPrompt, setIsEditing, setSelectedSystemPrompt]);

  const onShowSelectSystemPrompt = useCallback(() => {
    setIsEditing?.(true);
    setIsOpenLocal(true);
  }, [setIsEditing]);

  return (
    <EuiFlexGroup
      data-test-subj="selectSystemPrompt"
      gutterSize="none"
      alignItems="center"
      css={css`
        position: relative;
      `}
    >
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
              // Limits popover z-index to prevent it from getting too high and covering tooltips.
              // If the z-index is not defined, when a popover is opened, it sets the target z-index + 2000
              popoverProps={{ zIndex: euiThemeVars.euiZLevel8 }}
              compressed={compressed}
              data-test-subj={TEST_IDS.PROMPT_SUPERSELECT}
              fullWidth
              hasDividers
              itemLayoutAlign="top"
              disabled={isDisabled}
              isOpen={isOpenLocal && !isSettingsModalVisible}
              onChange={onChange}
              onBlur={handleOnBlur}
              options={[...options, addNewSystemPrompt]}
              placeholder={i18n.SELECT_A_SYSTEM_PROMPT}
              valueOfSelected={valueOfSelected}
              prepend={isFlyoutMode ? 'Select prompt' : undefined}
            />
          </EuiFormRow>
        )}
      </EuiFlexItem>

      <EuiFlexItem
        grow={false}
        css={
          isFlyoutMode
            ? css`
                position: absolute;
                right: 36px;
              `
            : undefined
        }
      >
        {isEditing && isClearable && selectedPrompt && (
          <EuiToolTip content={i18n.CLEAR_SYSTEM_PROMPT}>
            <EuiButtonIcon
              aria-label={i18n.CLEAR_SYSTEM_PROMPT}
              data-test-subj="clearSystemPrompt"
              iconType="cross"
              onClick={clearSystemPrompt}
              css={
                isFlyoutMode
                  ? // mimic EuiComboBox clear button
                    css`
                      inline-size: 16px;
                      block-size: 16px;
                      border-radius: 16px;
                      background: ${euiThemeVars.euiColorMediumShade};

                      :hover:not(:disabled) {
                        background: ${euiThemeVars.euiColorMediumShade};
                        transform: none;
                      }

                      > svg {
                        width: 8px;
                        height: 8px;
                        stroke-width: 2px;
                        fill: #fff;
                        stroke: #fff;
                      }
                    `
                  : undefined
              }
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
