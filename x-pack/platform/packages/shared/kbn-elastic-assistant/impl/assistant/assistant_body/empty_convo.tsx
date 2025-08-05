/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch, SetStateAction, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { AssistantBeacon } from '@kbn/ai-assistant-icon';
import { useVerticalBreakpoint } from './use_vertical_breakpoint';
import { StarterPrompts } from './starter_prompts';
import { SystemPrompt } from '../prompt_editor/system_prompt';
import { SetupKnowledgeBaseButton } from '../../knowledge_base/setup_knowledge_base_button';
import * as i18n from '../translations';

interface Props {
  connectorId?: string;
  currentSystemPromptId: string | undefined;
  isSettingsModalVisible: boolean;
  setIsSettingsModalVisible: Dispatch<SetStateAction<boolean>>;
  setCurrentSystemPromptId: (promptId: string | undefined) => void;
  allSystemPrompts: PromptResponse[];
  setUserPrompt: React.Dispatch<React.SetStateAction<string | null>>;
}
const starterPromptWrapperClassName = css`
  max-width: 95%;
`;

export const EmptyConvo: React.FC<Props> = ({
  allSystemPrompts,
  connectorId,
  currentSystemPromptId,
  isSettingsModalVisible,
  setCurrentSystemPromptId,
  setIsSettingsModalVisible,
  setUserPrompt,
}) => {
  const breakpoint = useVerticalBreakpoint();
  const compressed = useMemo(() => breakpoint !== 'tall', [breakpoint]);
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      data-test-subj="emptyConvo"
      direction="column"
      gutterSize={compressed ? 'm' : 'l'}
    >
      <EuiFlexItem grow={false}>
        <EuiPanel
          hasShadow={false}
          css={css`
            max-width: 400px;
            text-align: center;
          `}
        >
          <EuiFlexGroup
            alignItems="center"
            justifyContent="center"
            direction="column"
            gutterSize={compressed ? 'm' : 'l'}
          >
            <EuiFlexItem grow={false}>
              <AssistantBeacon backgroundColor="emptyShade" size={compressed ? 'm' : 'xl'} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size={compressed ? 'xs' : 'relative'}>
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
                compressed={compressed}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SetupKnowledgeBaseButton {...(compressed ? { display: 'mini' } : {})} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={starterPromptWrapperClassName}>
        <StarterPrompts
          compressed={compressed}
          connectorId={connectorId}
          setUserPrompt={setUserPrompt}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
