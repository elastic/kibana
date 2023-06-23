/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { QuickPrompt } from '../../../..';
import { useAssistantContext } from '../../../assistant_context';

interface UseSettingsUpdater {
  quickPromptSettings: QuickPrompt[];
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<QuickPrompt[]>>;
  saveSettings: () => void;
}

// TODO: Ensure base state gets reset on `cancel` action

export const useSettingsUpdater = (): UseSettingsUpdater => {
  // Initial state from assistant context
  const { setAllQuickPrompts } = useAssistantContext();
  const { allQuickPrompts } = useAssistantContext();

  // Pending updated state
  const [updatedQuickPromptSettings, setUpdatedQuickPromptSettings] =
    useState<QuickPrompt[]>(allQuickPrompts);

  /**
   * Save all pending settings
   */
  const saveSettings = useCallback((): void => {
    setAllQuickPrompts(updatedQuickPromptSettings);
  }, [setAllQuickPrompts, updatedQuickPromptSettings]);

  return {
    quickPromptSettings: updatedQuickPromptSettings,
    setUpdatedQuickPromptSettings,
    saveSettings,
  };
};
