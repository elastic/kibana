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
import {
  PromptResponse,
  PromptTypeEnum,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import { QueryObserverResult } from '@tanstack/react-query';
import { Conversation } from '../../../../..';
import { getOptions } from '../helpers';
import * as i18n from '../translations';
import { useAssistantContext } from '../../../../assistant_context';
import { useConversation } from '../../../use_conversation';
import { TEST_IDS } from '../../../constants';
import { PROMPT_CONTEXT_SELECTOR_PREFIX } from '../../../quick_prompts/prompt_context_selector/translations';
import { SYSTEM_PROMPTS_TAB } from '../../../settings/const';

export interface Props {
  allPrompts: PromptResponse[];
  compressed?: boolean;
  conversation?: Conversation;
  selectedPrompt: PromptResponse | undefined;
  clearSelectedSystemPrompt?: () => void;
  isClearable?: boolean;
  isCleared?: boolean;
  isDisabled?: boolean;
  isOpen?: boolean;
  isSettingsModalVisible: boolean;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onSystemPromptSelectionChange?: (promptId: string | undefined) => void;
  onSelectedConversationChange?: (result: Conversation) => void;
  setConversationSettings?: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions?: React.Dispatch<Record<string, Conversation>>;
  refetchConversations?: () => Promise<QueryObserverResult<Record<string, Conversation>, unknown>>;
}

const ADD_NEW_SYSTEM_PROMPT = 'ADD_NEW_SYSTEM_PROMPT';

const SelectSystemPromptComponent: React.FC<Props> = ({
  allPrompts,
  compressed = false,
  conversation,
  selectedPrompt,
  clearSelectedSystemPrompt,
  isClearable = false,
  isCleared = false,
  isDisabled = false,
  isOpen = false,
  refetchConversations,
  isSettingsModalVisible,
  onSystemPromptSelectionChange,
  setIsSettingsModalVisible,
  onSelectedConversationChange,
  setConversationSettings,
  setConversationsSettingsBulkActions,
}) => {
  const { setSelectedSettingsTab } = useAssistantContext();
  const { setApiConfig } = useConversation();

  const allSystemPrompts = useMemo(
    () => allPrompts.filter((p) => p.promptType === PromptTypeEnum.system),
    [allPrompts]
  );

  const [isOpenLocal, setIsOpenLocal] = useState<boolean>(isOpen);
  const handleOnBlur = useCallback(() => setIsOpenLocal(false), []);
  const valueOfSelected = useMemo(() => selectedPrompt?.id, [selectedPrompt?.id]);

  // Write the selected system prompt to the conversation config
  const setSelectedSystemPrompt = useCallback(
    async (promptId?: string) => {
      if (conversation && conversation.apiConfig) {
        const result = await setApiConfig({
          conversation,
          apiConfig: {
            ...conversation.apiConfig,
            defaultSystemPromptId: promptId,
          },
        });
        await refetchConversations?.();
        return result;
      }
    },
    [conversation, refetchConversations, setApiConfig]
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
    () => getOptions({ prompts: allSystemPrompts, isCleared }),
    [allSystemPrompts, isCleared]
  );

  const onChange = useCallback(
    async (selectedSystemPromptId) => {
      if (selectedSystemPromptId === ADD_NEW_SYSTEM_PROMPT) {
        setIsSettingsModalVisible(true);
        setSelectedSettingsTab(SYSTEM_PROMPTS_TAB);
        return;
      }
      // Note: if callback is provided, this component does not persist. Extract to separate component
      if (onSystemPromptSelectionChange != null) {
        onSystemPromptSelectionChange(selectedSystemPromptId);
      }
      const result = await setSelectedSystemPrompt(selectedSystemPromptId);
      if (result) {
        setConversationSettings?.((prev: Record<string, Conversation>) => {
          const newConversationsSettings = Object.entries(prev).reduce<
            Record<string, Conversation>
          >((acc, [key, convo]) => {
            if (result.title === convo.title) {
              acc[result.id] = result;
            } else {
              acc[key] = convo;
            }
            return acc;
          }, {});
          return newConversationsSettings;
        });
        onSelectedConversationChange?.(result);
        setConversationsSettingsBulkActions?.({});
      }
    },
    [
      onSelectedConversationChange,
      onSystemPromptSelectionChange,
      setConversationSettings,
      setConversationsSettingsBulkActions,
      setIsSettingsModalVisible,
      setSelectedSettingsTab,
      setSelectedSystemPrompt,
    ]
  );

  const clearSystemPrompt = useCallback(() => {
    clearSelectedSystemPrompt?.();
  }, [clearSelectedSystemPrompt]);

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
            prepend={!isSettingsModalVisible ? PROMPT_CONTEXT_SELECTOR_PREFIX : undefined}
            css={css`
              padding-right: 56px !important;
            `}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem
        grow={false}
        css={css`
          position: absolute;
          right: 36px;
        `}
      >
        {isClearable && selectedPrompt && (
          <EuiToolTip content={i18n.CLEAR_SYSTEM_PROMPT}>
            <EuiButtonIcon
              aria-label={i18n.CLEAR_SYSTEM_PROMPT}
              data-test-subj="clearSystemPrompt"
              iconType="cross"
              onClick={clearSystemPrompt}
              // mimic EuiComboBox clear button
              css={css`
                inline-size: 16px;
                block-size: 16px;
                border-radius: 16px;
                background: ${isCleared
                  ? euiThemeVars.euiColorLightShade
                  : euiThemeVars.euiColorMediumShade};

                :hover:not(:disabled) {
                  background: ${isCleared
                    ? euiThemeVars.euiColorLightShade
                    : euiThemeVars.euiColorMediumShade};
                  transform: none;
                }

                > svg {
                  width: 8px;
                  height: 8px;
                  stroke-width: 2px;
                  fill: #fff;
                  stroke: #fff;
                }
              `}
            />
          </EuiToolTip>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SelectSystemPromptComponent.displayName = 'SelectSystemPromptComponent';

export const SelectSystemPrompt = React.memo(SelectSystemPromptComponent);
