/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { css } from '@emotion/react';
import { useAssistantContext } from '../../../assistant_context';
import { Conversation } from '../../../..';
import * as i18n from './translations';
import { SelectSystemPrompt } from './select_system_prompt';
import { useConversation } from '../../use_conversation';

interface Props {
  conversation: Conversation | undefined;
}

const SystemPromptComponent: React.FC<Props> = ({ conversation }) => {
  const { allSystemPrompts } = useAssistantContext();
  const { setApiConfig } = useConversation();

  const selectedPrompt = useMemo(
    () => allSystemPrompts?.find((p) => p.id === conversation?.apiConfig.defaultSystemPromptId),
    [allSystemPrompts, conversation]
  );

  const [isEditing, setIsEditing] = React.useState<boolean>(false);

  const handleClearSystemPrompt = useCallback(() => {
    if (conversation) {
      setApiConfig({
        conversationId: conversation.id,
        apiConfig: {
          ...conversation.apiConfig,
          defaultSystemPromptId: undefined,
        },
      });
    }
  }, [conversation, setApiConfig]);

  const handleEditSystemPrompt = useCallback(() => setIsEditing(true), []);

  return (
    <div>
      {selectedPrompt == null || isEditing ? (
        <SelectSystemPrompt
          allSystemPrompts={allSystemPrompts}
          clearSelectedSystemPrompt={handleClearSystemPrompt}
          conversation={conversation}
          data-test-subj="systemPrompt"
          isClearable={true}
          isEditing={isEditing}
          isOpen={isEditing}
          selectedPrompt={selectedPrompt}
          setIsEditing={setIsEditing}
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
              {selectedPrompt?.content ?? ''}
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
