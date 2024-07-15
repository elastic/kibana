/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { Conversation } from '../../../..';
import { SelectSystemPrompt } from './select_system_prompt';

interface Props {
  conversation: Conversation | undefined;
  editingSystemPromptId: string | undefined;
  isSettingsModalVisible: boolean;
  onSystemPromptSelectionChange: (systemPromptId: string | undefined) => void;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  allSystemPrompts: PromptResponse[];
}

const SystemPromptComponent: React.FC<Props> = ({
  conversation,
  editingSystemPromptId,
  isSettingsModalVisible,
  onSystemPromptSelectionChange,
  setIsSettingsModalVisible,
  allSystemPrompts,
}) => {
  const selectedPrompt = useMemo(() => {
    if (editingSystemPromptId !== undefined) {
      return allSystemPrompts.find((p) => p.id === editingSystemPromptId);
    } else {
      return allSystemPrompts.find((p) => p.id === conversation?.apiConfig?.defaultSystemPromptId);
    }
  }, [allSystemPrompts, conversation?.apiConfig?.defaultSystemPromptId, editingSystemPromptId]);

  const handleClearSystemPrompt = useCallback(() => {
    if (conversation) {
      onSystemPromptSelectionChange(undefined);
    }
  }, [conversation, onSystemPromptSelectionChange]);

  return (
    <SelectSystemPrompt
      allPrompts={allSystemPrompts}
      clearSelectedSystemPrompt={handleClearSystemPrompt}
      conversation={conversation}
      data-test-subj="systemPrompt"
      isClearable={true}
      isSettingsModalVisible={isSettingsModalVisible}
      onSystemPromptSelectionChange={onSystemPromptSelectionChange}
      selectedPrompt={selectedPrompt}
      setIsSettingsModalVisible={setIsSettingsModalVisible}
    />
  );
};

SystemPromptComponent.displayName = 'SystemPromptComponent';

export const SystemPrompt = React.memo(SystemPromptComponent);
