/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { AgentFirstAttachmentCoordinator } from './types';

const AgentFirstAttachmentCoordinatorContext = createContext<
  AgentFirstAttachmentCoordinator | undefined
>(undefined);

export const AgentFirstAttachmentCoordinatorContextProvider =
  AgentFirstAttachmentCoordinatorContext.Provider;

export const useAgentFirstAttachmentCoordinator = (): AgentFirstAttachmentCoordinator => {
  const context = useContext(AgentFirstAttachmentCoordinatorContext);

  if (context === undefined) {
    throw new Error(
      'useAgentFirstAttachmentCoordinator must be used within AgentFirstAttachmentCoordinatorProvider'
    );
  }

  return context;
};

export const useOptionalAgentFirstAttachmentCoordinator = ():
  | AgentFirstAttachmentCoordinator
  | undefined => useContext(AgentFirstAttachmentCoordinatorContext);
