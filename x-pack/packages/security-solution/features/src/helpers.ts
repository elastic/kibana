/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppFeatureKey, AppFeatureKeys, AppFeatureKibanaConfig } from './types';

/**
 * Creates the AppFeaturesConfig Map from the given appFeatures object and a set of enabled appFeatures keys.
 */
export const createEnabledAppFeaturesConfigMap = <
  K extends AppFeatureKey,
  T extends string = string
>(
  appFeatures: Record<K, AppFeatureKibanaConfig<T>>,
  enabledAppFeaturesKeys: AppFeatureKeys
) => {
  return new Map(
    Object.entries<AppFeatureKibanaConfig<T>>(appFeatures).reduce<
      Array<[K, AppFeatureKibanaConfig<T>]>
    >((acc, [key, value]) => {
      if (enabledAppFeaturesKeys.includes(key as K)) {
        acc.push([key as K, value]);
      }
      return acc;
    }, [])
  );
};
