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

import type { PromptContext } from '../prompt_context/types';
import { SystemPrompt } from './system_prompt';
import type { Prompt } from '../types';
import { getPromptById } from './helpers';

import * as i18n from './translations';
import { SelectedPromptContexts } from './selected_prompt_contexts';

interface Props {
  isNewConversation: boolean;
  promptContexts: Record<string, PromptContext>;
  promptTextPreview: string;
  selectedPromptContextIds: string[];
  selectedSystemPromptId: string | null;
  setSelectedPromptContextIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedSystemPromptId: React.Dispatch<React.SetStateAction<string | null>>;
  systemPrompts: Prompt[];
}

const PreviewText = styled(EuiText)`
  white-space: pre-line;
`;

const PromptEditorComponent: React.FC<Props> = ({
  isNewConversation,
  promptContexts,
  promptTextPreview,
  selectedPromptContextIds,
  selectedSystemPromptId,
  setSelectedPromptContextIds,
  setSelectedSystemPromptId,
  systemPrompts,
}) => {
  const selectedSystemPrompt = useMemo(
    () =>
      getPromptById({
        id: selectedSystemPromptId ?? '',
        prompts: systemPrompts,
      }),
    [selectedSystemPromptId, systemPrompts]
  );

  const commentBody = useMemo(
    () => (
      <>
        {isNewConversation && (
          <SystemPrompt
            selectedSystemPromptId={selectedSystemPromptId}
            setSelectedSystemPromptId={setSelectedSystemPromptId}
            systemPrompts={systemPrompts}
          />
        )}

        <SelectedPromptContexts
          isNewConversation={isNewConversation}
          promptContexts={promptContexts}
          selectedPromptContextIds={selectedPromptContextIds}
          setSelectedPromptContextIds={setSelectedPromptContextIds}
        />

        <PreviewText color="subdued">
          {selectedSystemPrompt != null && <>{'\n'}</>}
          {promptTextPreview}
        </PreviewText>
      </>
    ),
    [
      isNewConversation,
      promptContexts,
      promptTextPreview,
      selectedPromptContextIds,
      selectedSystemPrompt,
      selectedSystemPromptId,
      setSelectedPromptContextIds,
      setSelectedSystemPromptId,
      systemPrompts,
    ]
  );

  const comments = useMemo(
    () => [
      {
        children: commentBody,
        event: (
          <EuiText size="xs">
            <i>{i18n.EDITING_PROMPT}</i>
          </EuiText>
        ),
        timelineAvatar: <EuiAvatar name="user" size="l" color="subdued" iconType="logoSecurity" />,
        timelineAvatarAriaLabel: i18n.YOU,
        username: i18n.YOU,
      },
    ],
    [commentBody]
  );

  return <EuiCommentList comments={comments} aria-label={i18n.COMMENTS_LIST_ARIA_LABEL} />;
};

PromptEditorComponent.displayName = 'PromptEditorComponent';

export const PromptEditor = React.memo(PromptEditorComponent);
