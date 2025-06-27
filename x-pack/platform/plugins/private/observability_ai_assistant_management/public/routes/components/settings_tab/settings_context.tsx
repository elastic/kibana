/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCurrentlyDeployedInferenceId } from '@kbn/ai-assistant/src/hooks/use_current_inference_id';
import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface AssistantSettingsContextType {
  selectedInferenceId: string;
  setSelectedInferenceId: (inferenceId: string) => void;
}

const AssistantSettingsContext = createContext<AssistantSettingsContextType | undefined>(undefined);

interface AssistantSettingsProviderProps {
  children: ReactNode;
}

export function AssistantSettingsProvider({ children }: AssistantSettingsProviderProps) {
  const currentlyDeployedInferenceId = useCurrentlyDeployedInferenceId();
  const [selectedInferenceId, setSelectedInferenceId] = useState<string>('');

  const value = useMemo(() => {
    return {
      selectedInferenceId: selectedInferenceId ?? currentlyDeployedInferenceId,
      setSelectedInferenceId,
    };
  }, [selectedInferenceId, currentlyDeployedInferenceId]);

  return (
    <AssistantSettingsContext.Provider value={value}>{children}</AssistantSettingsContext.Provider>
  );
}

export function useAssistantSettings() {
  const context = useContext(AssistantSettingsContext);
  if (context === undefined) {
    throw new Error('useAssistantSettings must be used within an AssistantSettingsProvider');
  }
  return context;
}
