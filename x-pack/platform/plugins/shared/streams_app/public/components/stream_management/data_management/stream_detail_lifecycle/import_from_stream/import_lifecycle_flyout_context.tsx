/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface ImportLifecycleFlyoutContextValue {
  isOpen: boolean;
  isDisabled: boolean;
  open: () => void;
  close: () => void;
  setIsDisabled: (isDisabled: boolean) => void;
}

const ImportLifecycleFlyoutContext = createContext<ImportLifecycleFlyoutContextValue | undefined>(
  undefined
);

// Shares the import flyout open state between the tab label (trigger) and the
// tab content (flyout), which live under the same management `Wrapper`.
export const ImportLifecycleFlyoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const open = useCallback(() => {
    if (isDisabled) {
      return;
    }
    setIsOpen(true);
  }, [isDisabled]);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<ImportLifecycleFlyoutContextValue>(
    () => ({ isOpen, isDisabled, open, close, setIsDisabled }),
    [isDisabled, isOpen, open, close]
  );

  return (
    <ImportLifecycleFlyoutContext.Provider value={value}>
      {children}
    </ImportLifecycleFlyoutContext.Provider>
  );
};

export const useImportLifecycleFlyoutContext = ():
  | ImportLifecycleFlyoutContextValue
  | undefined => {
  return useContext(ImportLifecycleFlyoutContext);
};
