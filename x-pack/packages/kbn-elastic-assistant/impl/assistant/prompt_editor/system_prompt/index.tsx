/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { SelectSystemPrompt } from './select_system_prompt';

interface Props {
  allSystemPrompts: PromptResponse[];
  currentSystemPromptId: string | undefined;
  isSettingsModalVisible: boolean;
  onSystemPromptSelectionChange: (systemPromptId: string | undefined) => void;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const SystemPromptComponent: React.FC<Props> = ({
  allSystemPrompts,
  currentSystemPromptId,
  isSettingsModalVisible,
  onSystemPromptSelectionChange,
  setIsSettingsModalVisible,
}) => {
  const selectedPrompt = useMemo(
    () =>
      currentSystemPromptId !== undefined
        ? allSystemPrompts.find((p) => p.id === currentSystemPromptId)
        : undefined,
    [allSystemPrompts, currentSystemPromptId]
  );

  const handleClearSystemPrompt = useCallback(() => {
    onSystemPromptSelectionChange(undefined);
  }, [onSystemPromptSelectionChange]);

  return (
    <SelectSystemPrompt
      allPrompts={allSystemPrompts}
      clearSelectedSystemPrompt={handleClearSystemPrompt}
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
