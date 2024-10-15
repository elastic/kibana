/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch, SetStateAction } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { AssistantAnimatedIcon } from '../assistant_animated_icon';
import { SystemPrompt } from '../prompt_editor/system_prompt';
import { SetupKnowledgeBaseButton } from '../../knowledge_base/setup_knowledge_base_button';
import * as i18n from '../translations';

interface Props {
  currentSystemPromptId: string | undefined;
  isSettingsModalVisible: boolean;
  setIsSettingsModalVisible: Dispatch<SetStateAction<boolean>>;
  setCurrentSystemPromptId: (promptId: string | undefined) => void;
  allSystemPrompts: PromptResponse[];
}

export const EmptyConvo: React.FC<Props> = ({
  allSystemPrompts,
  currentSystemPromptId,
  isSettingsModalVisible,
  setCurrentSystemPromptId,
  setIsSettingsModalVisible,
}) => {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" data-test-subj="emptyConvo">
      <EuiFlexItem grow={false}>
        <EuiPanel
          hasShadow={false}
          css={css`
            max-width: 400px;
            text-align: center;
          `}
        >
          <EuiFlexGroup alignItems="center" justifyContent="center" direction="column">
            <EuiFlexItem grow={false}>
              <AssistantAnimatedIcon />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>
                <h3>{i18n.EMPTY_SCREEN_TITLE}</h3>
                <p>{i18n.EMPTY_SCREEN_DESCRIPTION}</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SystemPrompt
                allSystemPrompts={allSystemPrompts}
                currentSystemPromptId={currentSystemPromptId}
                isSettingsModalVisible={isSettingsModalVisible}
                onSystemPromptSelectionChange={setCurrentSystemPromptId}
                setIsSettingsModalVisible={setIsSettingsModalVisible}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SetupKnowledgeBaseButton />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
