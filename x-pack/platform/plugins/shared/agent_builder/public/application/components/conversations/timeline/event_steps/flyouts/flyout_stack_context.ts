/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';

interface FlyoutStackContextValue {
  openToolStep: (step: ToolCallStep) => void;
}

export const FlyoutStackContext = createContext<FlyoutStackContextValue | null>(null);

export const useFlyoutStack = () => useContext(FlyoutStackContext);
