/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { css } from '@emotion/react';
import { isEmpty } from 'lodash/fp';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { Conversation } from '../../../..';
import * as i18n from './translations';
import { SelectSystemPrompt } from './select_system_prompt';

interface Props {
  conversation: Conversation | undefined;
  editingSystemPromptId: string | undefined;
  isSettingsModalVisible: boolean;
  onSystemPromptSelectionChange: (systemPromptId: string | undefined) => void;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isFlyoutMode: boolean;
  allSystemPrompts: PromptResponse[];
}

const SystemPromptComponent: React.FC<Props> = ({
  conversation,
  editingSystemPromptId,
  isSettingsModalVisible,
  onSystemPromptSelectionChange,
  setIsSettingsModalVisible,
  isFlyoutMode,
  allSystemPrompts,
}) => {
  const selectedPrompt = useMemo(() => {
    if (editingSystemPromptId !== undefined) {
      return allSystemPrompts.find((p) => p.id === editingSystemPromptId);
    } else {
      return allSystemPrompts.find((p) => p.id === conversation?.apiConfig?.defaultSystemPromptId);
    }
  }, [allSystemPrompts, conversation?.apiConfig?.defaultSystemPromptId, editingSystemPromptId]);

  const [isEditing, setIsEditing] = React.useState<boolean>(false);

  const handleClearSystemPrompt = useCallback(() => {
    if (conversation) {
      onSystemPromptSelectionChange(undefined);
    }
  }, [conversation, onSystemPromptSelectionChange]);

  const handleEditSystemPrompt = useCallback(() => setIsEditing(true), []);

  if (isFlyoutMode) {
    return (
      <SelectSystemPrompt
        allPrompts={allSystemPrompts}
        clearSelectedSystemPrompt={handleClearSystemPrompt}
        conversation={conversation}
        data-test-subj="systemPrompt"
        isClearable={true}
        isEditing={true}
        setIsEditing={setIsEditing}
        isSettingsModalVisible={isSettingsModalVisible}
        onSystemPromptSelectionChange={onSystemPromptSelectionChange}
        selectedPrompt={selectedPrompt}
        setIsSettingsModalVisible={setIsSettingsModalVisible}
        isFlyoutMode={isFlyoutMode}
      />
    );
  }

  return (
    <div>
      {selectedPrompt == null || isEditing ? (
        <SelectSystemPrompt
          allPrompts={allSystemPrompts}
          clearSelectedSystemPrompt={handleClearSystemPrompt}
          conversation={conversation}
          data-test-subj="systemPrompt"
          isClearable={true}
          isEditing={isEditing}
          isOpen={isEditing}
          isSettingsModalVisible={isSettingsModalVisible}
          onSystemPromptSelectionChange={onSystemPromptSelectionChange}
          selectedPrompt={selectedPrompt}
          setIsEditing={setIsEditing}
          setIsSettingsModalVisible={setIsSettingsModalVisible}
          isFlyoutMode={isFlyoutMode}
        />
      ) : (
        <EuiFlexGroup alignItems="flexStart" gutterSize="none">
          <EuiFlexItem grow>
            <EuiText
              color="subdued"
              data-test-subj="systemPromptText"
              onClick={handleEditSystemPrompt}
              css={css`
                white-space: pre-line;
                &:hover {
                  cursor: pointer;
                  text-decoration: underline;
                }
              `}
            >
              {isEmpty(selectedPrompt?.content) ? i18n.EMPTY_PROMPT : selectedPrompt?.content}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.SELECT_A_SYSTEM_PROMPT}>
                  <EuiButtonIcon
                    aria-label={i18n.SELECT_A_SYSTEM_PROMPT}
                    data-test-subj="edit"
                    iconType="documentEdit"
                    onClick={handleEditSystemPrompt}
                  />
                </EuiToolTip>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.CLEAR_SYSTEM_PROMPT}>
                  <EuiButtonIcon
                    aria-label={i18n.CLEAR_SYSTEM_PROMPT}
                    data-test-subj="clear"
                    iconType="cross"
                    onClick={handleClearSystemPrompt}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </div>
  );
};

SystemPromptComponent.displayName = 'SystemPromptComponent';

export const SystemPrompt = React.memo(SystemPromptComponent);
