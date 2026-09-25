/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useSaveAiIndexMemory } from '../../hooks/use_save_ai_index_memory';
import { MemorySettingsPanel } from '../memory_settings_panel';

interface MemoryPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
}

export const MemoryPanel = ({ isLoading, aiIndex, onSaved }: MemoryPanelProps) => {
  const { saveMemoryEnabled, isSaving } = useSaveAiIndexMemory();

  const handleChange = async () => {
    if (!aiIndex) {
      return;
    }
    const saved = await saveMemoryEnabled(aiIndex, !aiIndex.memory_enabled);
    if (saved) {
      onSaved();
    }
  };

  return (
    <MemorySettingsPanel
      checked={aiIndex?.memory_enabled ?? false}
      onChange={handleChange}
      disabled={aiIndex === undefined || aiIndex.managed || isSaving}
      isLoading={isLoading}
      toggleTestSubject="contextAiIndexMemoryToggle"
      loadingTestSubject="contextAiIndexMemoryLoading"
    />
  );
};
