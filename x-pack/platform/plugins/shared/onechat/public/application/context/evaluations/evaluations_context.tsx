/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';

interface EvaluationsContextValue {
  showThinking: boolean;
  setShowThinking: (show: boolean) => void;
}

const EvaluationsContext = createContext<EvaluationsContextValue | undefined>(undefined);

interface EvaluationsProviderProps {
  children: ReactNode;
}

export const EvaluationsProvider: React.FC<EvaluationsProviderProps> = ({ children }) => {
  const [showThinking, setShowThinking] = useState(false);

  const value: EvaluationsContextValue = {
    showThinking,
    setShowThinking,
  };

  return <EvaluationsContext.Provider value={value}>{children}</EvaluationsContext.Provider>;
};

export const useEvaluations = (): EvaluationsContextValue => {
  const context = useContext(EvaluationsContext);
  if (context === undefined) {
    throw new Error('useEvaluations must be used within an EvaluationsProvider');
  }
  return context;
};
