/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar, EuiCommentList, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { Conversation } from '../../..';
import type { PromptContext, SelectedPromptContext } from '../prompt_context/types';
import { SystemPrompt } from './system_prompt';

import * as i18n from './translations';
import { SelectedPromptContexts } from './selected_prompt_contexts';

export interface Props {
  conversation: Conversation | undefined;
  editingSystemPromptId: string | undefined;
  isNewConversation: boolean;
  isSettingsModalVisible: boolean;
  promptContexts: Record<string, PromptContext>;
  promptTextPreview: string;
  onSystemPromptSelectionChange: (systemPromptId: string | undefined) => void;
  selectedPromptContexts: Record<string, SelectedPromptContext>;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedPromptContexts: React.Dispatch<
    React.SetStateAction<Record<string, SelectedPromptContext>>
  >;
}

const PreviewText = styled(EuiText)`
  white-space: pre-line;
`;

const PromptEditorComponent: React.FC<Props> = ({
  conversation,
  editingSystemPromptId,
  isNewConversation,
  isSettingsModalVisible,
  promptContexts,
  promptTextPreview,
  onSystemPromptSelectionChange,
  selectedPromptContexts,
  setIsSettingsModalVisible,
  setSelectedPromptContexts,
}) => {
  const commentBody = useMemo(
    () => (
      <>
        {isNewConversation && (
          <SystemPrompt
            conversation={conversation}
            editingSystemPromptId={editingSystemPromptId}
            onSystemPromptSelectionChange={onSystemPromptSelectionChange}
            isSettingsModalVisible={isSettingsModalVisible}
            setIsSettingsModalVisible={setIsSettingsModalVisible}
          />
        )}

        <SelectedPromptContexts
          isNewConversation={isNewConversation}
          promptContexts={promptContexts}
          selectedPromptContexts={selectedPromptContexts}
          setSelectedPromptContexts={setSelectedPromptContexts}
        />

        <PreviewText color="subdued" data-test-subj="previewText">
          {promptTextPreview}
        </PreviewText>
      </>
    ),
    [
      conversation,
      editingSystemPromptId,
      isNewConversation,
      isSettingsModalVisible,
      onSystemPromptSelectionChange,
      promptContexts,
      promptTextPreview,
      selectedPromptContexts,
      setIsSettingsModalVisible,
      setSelectedPromptContexts,
    ]
  );

  const comments = useMemo(
    () => [
      {
        children: commentBody,
        event: (
          <EuiText data-test-subj="eventText" size="xs">
            <i>{i18n.EDITING_PROMPT}</i>
          </EuiText>
        ),
        timelineAvatar: (
          <EuiAvatar
            data-test-subj="userAvatar"
            name="user"
            size="l"
            color="subdued"
            iconType="userAvatar"
          />
        ),
        timelineAvatarAriaLabel: i18n.YOU,
        username: i18n.YOU,
      },
    ],
    [commentBody]
  );

  return <EuiCommentList aria-label={i18n.COMMENTS_LIST_ARIA_LABEL} comments={comments} />;
};

PromptEditorComponent.displayName = 'PromptEditorComponent';

export const PromptEditor = React.memo(PromptEditorComponent);
