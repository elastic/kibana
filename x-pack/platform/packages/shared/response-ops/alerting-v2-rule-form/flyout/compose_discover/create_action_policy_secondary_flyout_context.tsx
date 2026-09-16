/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export interface CreatedActionPolicySummary {
  id: string;
  name: string;
  tags: string[];
}

export interface OpenCreateActionPolicyFlyoutOptions {
  /** Compact create-from-rule layout vs full form. */
  variant?: 'full' | 'essential';
  /** Prefills matcher rule.tags when opening from a rule. */
  ruleTags?: string[];
}

interface CreateActionPolicySecondaryFlyoutContextValue {
  isOpen: boolean;
  open: (
    onCreated: (policy: CreatedActionPolicySummary) => void,
    options?: OpenCreateActionPolicyFlyoutOptions
  ) => void;
  close: () => void;
  /**
   * Callback registered by the opener; invoked by the flyout host on successful create.
   */
  notifyCreated: (policy: CreatedActionPolicySummary) => void;
  /** Options from the last `open` call — consumed by the flyout host. */
  options: OpenCreateActionPolicyFlyoutOptions;
}

const CreateActionPolicySecondaryFlyoutContext = createContext<
  CreateActionPolicySecondaryFlyoutContextValue | undefined
>(undefined);

/**
 * Coordinates opening the create-action-policy secondary flyout from nested form
 * steps, while the flyout itself is rendered as a sibling of QuerySandboxFlyout
 * under the Compose Discover parent flyout.
 */
export const CreateActionPolicySecondaryFlyoutProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<OpenCreateActionPolicyFlyoutOptions>({});
  const onCreatedRef = useRef<((policy: CreatedActionPolicySummary) => void) | null>(null);

  const open = useCallback(
    (
      onCreated: (policy: CreatedActionPolicySummary) => void,
      nextOptions: OpenCreateActionPolicyFlyoutOptions = {}
    ) => {
      onCreatedRef.current = onCreated;
      setOptions(nextOptions);
      setIsOpen(true);
    },
    []
  );

  const close = useCallback(() => {
    setIsOpen(false);
    onCreatedRef.current = null;
    setOptions({});
  }, []);

  const notifyCreated = useCallback((policy: CreatedActionPolicySummary) => {
    onCreatedRef.current?.(policy);
    onCreatedRef.current = null;
    setIsOpen(false);
    setOptions({});
  }, []);

  const value = useMemo(
    () => ({ isOpen, open, close, notifyCreated, options }),
    [isOpen, open, close, notifyCreated, options]
  );

  return (
    <CreateActionPolicySecondaryFlyoutContext.Provider value={value}>
      {children}
    </CreateActionPolicySecondaryFlyoutContext.Provider>
  );
};

export const useCreateActionPolicySecondaryFlyout =
  (): CreateActionPolicySecondaryFlyoutContextValue => {
    const context = useContext(CreateActionPolicySecondaryFlyoutContext);
    if (!context) {
      throw new Error(
        'useCreateActionPolicySecondaryFlyout must be used within CreateActionPolicySecondaryFlyoutProvider'
      );
    }
    return context;
  };
