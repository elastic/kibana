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
import { SystemPromptModal } from '../system_prompt_modal/system_prompt_modal';
import { TEST_IDS } from '../../../constants';

export interface Props {
  conversation: Conversation | undefined;
  selectedPrompt: Prompt | undefined;
  clearSelectedSystemPrompt?: () => void;
  fullWidth?: boolean;
  isClearable?: boolean;
  isEditing?: boolean;
  isOpen?: boolean;
  onSystemPromptModalVisibilityChange?: (isVisible: boolean) => void;
  setIsEditing?: React.Dispatch<React.SetStateAction<boolean>>;
  showTitles?: boolean;
}

const ADD_NEW_SYSTEM_PROMPT = 'ADD_NEW_SYSTEM_PROMPT';

const SelectSystemPromptComponent: React.FC<Props> = ({
  conversation,
  selectedPrompt,
  clearSelectedSystemPrompt,
  fullWidth = true,
  isClearable = false,
  isEditing = false,
  isOpen = false,
  onSystemPromptModalVisibilityChange,
  setIsEditing,
  showTitles = false,
}) => {
  const { allSystemPrompts, setAllSystemPrompts, conversations, setConversations } =
    useAssistantContext();

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
            defaultSystemPromptId: prompt?.id,
          },
        });
      }
    },
    [conversation, setApiConfig]
  );

  // Connector Modal State
  const [isSystemPromptModalVisible, setIsSystemPromptModalVisible] = useState<boolean>(false);
  const addNewSystemPrompt = useMemo(() => {
    return {
      value: ADD_NEW_SYSTEM_PROMPT,
      inputDisplay: i18n.ADD_NEW_SYSTEM_PROMPT,
      dropdownDisplay: (
        <EuiFlexGroup gutterSize="none" key={ADD_NEW_SYSTEM_PROMPT}>
          <EuiFlexItem grow={true}>
            <EuiButtonEmpty iconType="plus" size="xs" data-test-subj="addSystemPrompt">
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

  // Callback for modal onSave, saves to local storage on change
  const onSystemPromptsChange = useCallback(
    (newSystemPrompts: Prompt[], updatedConversations?: Conversation[]) => {
      setAllSystemPrompts(newSystemPrompts);
      setIsSystemPromptModalVisible(false);
      onSystemPromptModalVisibilityChange?.(false);

      if (updatedConversations && updatedConversations.length > 0) {
        const updatedConversationObject = updatedConversations?.reduce<
          Record<string, Conversation>
        >((updatedObj, currentConv) => {
          updatedObj[currentConv.id] = currentConv;
          return updatedObj;
        }, {});
        setConversations({
          ...conversations,
          ...updatedConversationObject,
        });
      }
    },
    [onSystemPromptModalVisibilityChange, setAllSystemPrompts, conversations, setConversations]
  );

  // SuperSelect State/Actions
  const options = useMemo(
    () => getOptions({ prompts: allSystemPrompts, showTitles }),
    [allSystemPrompts, showTitles]
  );

  const onChange = useCallback(
    (selectedSystemPromptId) => {
      if (selectedSystemPromptId === ADD_NEW_SYSTEM_PROMPT) {
        onSystemPromptModalVisibilityChange?.(true);
        setIsSystemPromptModalVisible(true);
        return;
      }
      setSelectedSystemPrompt(allSystemPrompts.find((sp) => sp.id === selectedSystemPromptId));
      setIsEditing?.(false);
    },
    [allSystemPrompts, onSystemPromptModalVisibilityChange, setIsEditing, setSelectedSystemPrompt]
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
              // Limits popover z-index to prevent it from getting too high and covering tooltips.
              // If the z-index is not defined, when a popover is opened, it sets the target z-index + 2000
              popoverProps={{ zIndex: euiThemeVars.euiZLevel8 }}
              data-test-subj={TEST_IDS.PROMPT_SUPERSELECT}
              fullWidth={fullWidth}
              hasDividers
              itemLayoutAlign="top"
              isOpen={isOpenLocal && !isSystemPromptModalVisible}
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
      {isSystemPromptModalVisible && (
        <SystemPromptModal
          onClose={() => setIsSystemPromptModalVisible(false)}
          onSystemPromptsChange={onSystemPromptsChange}
          systemPrompts={allSystemPrompts}
        />
      )}
    </EuiFlexGroup>
  );
};

SelectSystemPromptComponent.displayName = 'SelectSystemPromptComponent';

export const SelectSystemPrompt = React.memo(SelectSystemPromptComponent);
