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

export const OnechatSpaceIdProvider: React.FC<SpaceIdProviderProps> = ({ children, spaceId }) => {
  return <SpaceIdContext.Provider value={{ spaceId }}>{children}</SpaceIdContext.Provider>;
};

export const useOnechatSpaceId = () => {
  const context = React.useContext(SpaceIdContext);
  if (context === undefined) {
    throw new Error('useOnechatSpaceId must be used within a OnechatSpaceIdProvider');
  }
  return context.spaceId;
};
