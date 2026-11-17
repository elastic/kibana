/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';

export interface EmbeddedContextValue {
  /** True when Integrations UI is rendered inside another app (e.g. the Add integration modal). */
  isEmbedded: boolean;
  /**
   * Closes the embedding surface. Embedded pages call this where they would otherwise navigate
   * out of the app — Cancel, and the redirect after a package policy is saved.
   */
  onClose?: () => void;
}

const EmbeddedContext = createContext<EmbeddedContextValue>({ isEmbedded: false });

export const EmbeddedContextProvider: React.FC<{
  onClose?: () => void;
  children: React.ReactNode;
}> = ({ onClose, children }) => {
  const value = useMemo(() => ({ isEmbedded: true, onClose }), [onClose]);
  return <EmbeddedContext.Provider value={value}>{children}</EmbeddedContext.Provider>;
};

/**
 * Tells a page whether it is rendered inside the Integrations app or embedded in another app.
 * Outside an `EmbeddedContextProvider` this reports `isEmbedded: false`, so pages that do not
 * care are unaffected.
 */
export function useEmbeddedContext(): EmbeddedContextValue {
  return useContext(EmbeddedContext);
}
