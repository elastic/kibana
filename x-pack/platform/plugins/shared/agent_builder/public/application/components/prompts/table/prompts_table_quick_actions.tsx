/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import type { UserPrompt } from '../../../../../common/http_api/user_prompts';
import { labels } from '../../../utils/i18n';

export interface PromptsQuickActionsProps {
  prompt: UserPrompt;
  onEdit: (promptId: string) => void;
  onDelete: (promptId: string) => void;
  startChatHref: string;
}

export const PromptsQuickActions = ({
  prompt,
  onEdit,
  onDelete,
  startChatHref,
}: PromptsQuickActionsProps) => {
  return (
    <EuiFlexGroup
      css={css`
        visibility: hidden;
      `}
      className="prompts-quick-actions"
      gutterSize="s"
      alignItems="center"
      justifyContent="flexEnd"
    >
      <EuiButtonIcon
        data-test-subj={`agentBuilderPromptsRowStartChatButton-${prompt.id}`}
        iconType="comment"
        href={startChatHref}
        aria-label={labels.prompts.startChatButtonLabel}
      />
      <EuiButtonIcon
        data-test-subj={`agentBuilderPromptsRowEditButton-${prompt.id}`}
        iconType="documentEdit"
        onClick={() => {
          onEdit(prompt.id);
        }}
        aria-label={labels.prompts.editPromptButtonLabel}
      />
      <EuiButtonIcon
        data-test-subj={`agentBuilderPromptsRowDeleteButton-${prompt.id}`}
        iconType="trash"
        color="danger"
        onClick={() => {
          onDelete(prompt.id);
        }}
        aria-label={labels.prompts.deletePromptButtonLabel}
      />
    </EuiFlexGroup>
  );
};
