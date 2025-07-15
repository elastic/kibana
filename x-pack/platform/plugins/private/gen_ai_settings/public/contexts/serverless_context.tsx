/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo } from 'react';

export interface EnabledFeatures {
  showSpacesIntegration: boolean;
}

export const EnabledFeaturesContext = createContext<EnabledFeatures>({
  showSpacesIntegration: true,
});

interface Props {
  isServerless: boolean;
}

export const EnabledFeaturesContextProvider: FC<PropsWithChildren<Props>> = ({
  children,
  isServerless,
}) => {
  const features: EnabledFeatures = useMemo(
    () => ({
      showSpacesIntegration: !isServerless,
    }),
    [isServerless]
  );

  return (
    <EnabledFeaturesContext.Provider value={features}>{children}</EnabledFeaturesContext.Provider>
  );
};

export const useEnabledFeatures = (): EnabledFeatures => {
  const context = useContext(EnabledFeaturesContext);
  if (!context) {
    throw new Error('useEnabledFeatures must be used within EnabledFeaturesContextProvider');
  }
  return context;
};
