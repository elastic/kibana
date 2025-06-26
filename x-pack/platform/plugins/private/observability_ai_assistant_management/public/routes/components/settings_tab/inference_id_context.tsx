/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCurrentlyDeployedInferenceId } from '@kbn/ai-assistant/src/hooks/use_current_inference_id';
import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface InferenceIdContextType {
  selectedInferenceId: string;
  setSelectedInferenceId: (inferenceId: string) => void;
}

const InferenceIdContext = createContext<InferenceIdContextType | undefined>(undefined);

interface InferenceIdProviderProps {
  children: ReactNode;
}

export function InferenceIdProvider({ children }: InferenceIdProviderProps) {
  const currentlyDeployedInferenceId = useCurrentlyDeployedInferenceId();
  const [selectedInferenceId, setSelectedInferenceId] = useState<string>('');

  const value = useMemo(() => {
    return {
      selectedInferenceId: selectedInferenceId ?? currentlyDeployedInferenceId,
      setSelectedInferenceId,
    };
  }, [selectedInferenceId, currentlyDeployedInferenceId]);

  return <InferenceIdContext.Provider value={value}>{children}</InferenceIdContext.Provider>;
}

export function useInferenceId() {
  const context = useContext(InferenceIdContext);
  if (context === undefined) {
    throw new Error('useInferenceId must be used within an InferenceIdProvider');
  }
  return context;
}
