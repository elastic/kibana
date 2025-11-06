/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { ExperimentalFeatures } from '../../common/experimental_features';
import { allowedExperimentalValues } from '../../common/experimental_features';

const ExperimentalFeaturesContext = createContext<ExperimentalFeatures | null>(null);

export const ExperimentalFeaturesProvider: React.FC<{
  value: ExperimentalFeatures;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <ExperimentalFeaturesContext.Provider value={value}>
    {children}
  </ExperimentalFeaturesContext.Provider>
);

export const useExperimentalFeatures = (): ExperimentalFeatures => {
  const context = useContext(ExperimentalFeaturesContext);
  if (context === null) {
    throw new Error('useExperimentalFeatures must be used within ExperimentalFeaturesProvider');
  }

  return context;
};

export const useIsExperimentalFeatureEnabled = (feature: keyof ExperimentalFeatures): boolean => {
  const experimentalFeatures = useExperimentalFeatures();

  if (!experimentalFeatures || !(feature in experimentalFeatures)) {
    throw new Error(
      `Invalid experimental feature ${feature}. Allowed values are: ${Object.keys(
        allowedExperimentalValues
      ).join(', ')}`
    );
  }

  return experimentalFeatures[feature];
};
