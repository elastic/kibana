/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { useAssistantContext } from '../../../assistant_context';
import { Conversation } from '../../../..';
import { SelectSystemPrompt } from './select_system_prompt';

interface Props {
  conversation: Conversation | undefined;
  editingSystemPromptId: string | undefined;
  isSettingsModalVisible: boolean;
  onSystemPromptSelectionChange: (systemPromptId: string | undefined) => void;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const SystemPromptComponent: React.FC<Props> = ({
  conversation,
  editingSystemPromptId,
  isSettingsModalVisible,
  onSystemPromptSelectionChange,
  setIsSettingsModalVisible,
}) => {
  const { allSystemPrompts } = useAssistantContext();

  const selectedPrompt = useMemo(() => {
    if (editingSystemPromptId !== undefined) {
      return (
        allSystemPrompts?.find((p) => p.id === editingSystemPromptId) ??
        allSystemPrompts?.find((p) => p.id === conversation?.apiConfig?.defaultSystemPromptId)
      );
    } else {
      return undefined;
    }
  }, [allSystemPrompts, conversation?.apiConfig?.defaultSystemPromptId, editingSystemPromptId]);

  const handleClearSystemPrompt = useCallback(() => {
    if (conversation) {
      onSystemPromptSelectionChange(undefined);
    }
  }, [conversation, onSystemPromptSelectionChange]);

  return (
    <SelectSystemPrompt
      allSystemPrompts={allSystemPrompts}
      clearSelectedSystemPrompt={handleClearSystemPrompt}
      conversation={conversation}
      data-test-subj="systemPrompt"
      isSettingsModalVisible={isSettingsModalVisible}
      onSystemPromptSelectionChange={onSystemPromptSelectionChange}
      selectedPrompt={selectedPrompt}
      setIsSettingsModalVisible={setIsSettingsModalVisible}
    />
  );
};

SystemPromptComponent.displayName = 'SystemPromptComponent';

export const SystemPrompt = React.memo(SystemPromptComponent);
