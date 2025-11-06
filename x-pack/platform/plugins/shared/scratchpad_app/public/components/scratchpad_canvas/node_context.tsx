/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { ScratchpadNode } from '../hooks/use_scratchpad_state';

interface ScratchpadNodeContextValue {
  onUpdateNode?: (nodeId: string, updates: Partial<ScratchpadNode>) => void;
  timeRange?: TimeRange;
}

const ScratchpadNodeContext = createContext<ScratchpadNodeContextValue>({});

export const ScratchpadNodeProvider = ScratchpadNodeContext.Provider;

export function useScratchpadNodeContext() {
  return useContext(ScratchpadNodeContext);
}

