/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect } from 'react';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

const ActiveSpaceContext = createContext<string>(DEFAULT_SPACE_ID);

let resolvedSpaceId: string = DEFAULT_SPACE_ID;

/**
 * Synchronous accessor for the active space ID. Set by ActiveSpaceProvider on
 * mount. Use this only from non-React call sites — React components should use
 * useActiveSpaceId() instead.
 */
export const getResolvedSpaceId = (): string => resolvedSpaceId;

export const useActiveSpaceId = (): string => useContext(ActiveSpaceContext);

interface ActiveSpaceProviderProps {
  spaceId: string;
  children: React.ReactNode;
}

export const ActiveSpaceProvider: React.FC<ActiveSpaceProviderProps> = ({ spaceId, children }) => {
  useEffect(() => {
    resolvedSpaceId = spaceId;
  }, [spaceId]);

  // Set synchronously on first render so the module-scoped getter is correct
  // before any effects run.
  resolvedSpaceId = spaceId;

  return <ActiveSpaceContext.Provider value={spaceId}>{children}</ActiveSpaceContext.Provider>;
};
