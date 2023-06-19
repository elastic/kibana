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
  isNewConversation: boolean;
  promptContexts: Record<string, PromptContext>;
  promptTextPreview: string;
  selectedPromptContexts: Record<string, SelectedPromptContext>;
  setSelectedPromptContexts: React.Dispatch<
    React.SetStateAction<Record<string, SelectedPromptContext>>
  >;
}

const PreviewText = styled(EuiText)`
  white-space: pre-line;
`;

const PromptEditorComponent: React.FC<Props> = ({
  conversation,
  isNewConversation,
  promptContexts,
  promptTextPreview,
  selectedPromptContexts,
  setSelectedPromptContexts,
}) => {
  const commentBody = useMemo(
    () => (
      <>
        {isNewConversation && <SystemPrompt conversation={conversation} />}

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
      isNewConversation,
      promptContexts,
      promptTextPreview,
      selectedPromptContexts,
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
