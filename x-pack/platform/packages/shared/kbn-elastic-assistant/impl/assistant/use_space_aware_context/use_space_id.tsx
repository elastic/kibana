/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

interface UseSpaceIdContext {
  spaceId: string;
}
interface SpaceIdProviderProps extends UseSpaceIdContext {
  children: React.ReactNode;
}

const SpaceIdContext = React.createContext<UseSpaceIdContext | undefined>(undefined);

export const AssistantSpaceIdProvider: React.FC<SpaceIdProviderProps> = ({ children, spaceId }) => {
  return <SpaceIdContext.Provider value={{ spaceId }}>{children}</SpaceIdContext.Provider>;
};

export const useAssistantSpaceId = () => {
  const context = React.useContext(SpaceIdContext);
  if (context === undefined) {
    throw new Error('useSpaceId must be used within a AssistantSpaceIdProvider');
  }
  return context.spaceId;
};
