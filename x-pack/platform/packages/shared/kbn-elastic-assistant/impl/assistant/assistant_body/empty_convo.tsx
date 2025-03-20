/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch, SetStateAction } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { InstallKnowledgeBase, ReadyToHelp } from '@kbn/ai-assistant-cta';
import { SystemPrompt } from '../prompt_editor/system_prompt';
import { useKnowledgeBaseInstall } from '../../knowledge_base/use_knowledge_base_install';

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
  const { isSetupAvailable, isSetupComplete, onInstallKnowledgeBase, isSetupInProgress } =
    useKnowledgeBaseInstall();

  if (!isSetupComplete) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" data-test-subj="emptyConvo">
        <EuiFlexItem grow={true}>
          <InstallKnowledgeBase
            onInstallKnowledgeBase={onInstallKnowledgeBase}
            isInstallAvailable={isSetupAvailable}
            isInstalling={isSetupInProgress}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="center"
      direction="column"
      data-test-subj="emptyConvo"
    >
      <EuiFlexItem grow={false}>
        <ReadyToHelp type="security" />
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
    </EuiFlexGroup>
  );
};
