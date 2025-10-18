/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';

interface ConditionHighlightContextValue {
  activeConditionId: string | null;
  setActiveConditionId: (id: string | null) => void;
}

const ConditionHighlightContext = createContext<ConditionHighlightContextValue | undefined>(
  undefined
);

export const ConditionHighlightProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [activeConditionId, setActiveConditionId] = useState<string | null>(null);

  const contextValue = useMemo(
    () => ({
      activeConditionId,
      setActiveConditionId,
    }),
    [activeConditionId]
  );

  return (
    <ConditionHighlightContext.Provider value={contextValue}>
      {children}
    </ConditionHighlightContext.Provider>
  );
};

export const useConditionHighlight = () => {
  const context = useContext(ConditionHighlightContext);

  if (!context) {
    throw new Error('useConditionHighlight must be used within a ConditionHighlightProvider');
  }

  return context;
};
