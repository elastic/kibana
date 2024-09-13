/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ProductFeatureKeys,
  ProductFeatureKeyType,
  ProductFeatureKibanaConfig,
} from './types';

/**
 * Creates the ProductFeaturesConfig Map from the given productFeatures object and a set of enabled productFeatures keys.
 */
export const createEnabledProductFeaturesConfigMap = <
  K extends ProductFeatureKeyType,
  T extends string = string
>(
  productFeatures: Record<K, ProductFeatureKibanaConfig<T>>,
  enabledProductFeaturesKeys: ProductFeatureKeys
) =>
  new Map(
    Object.entries<ProductFeatureKibanaConfig<T>>(productFeatures).reduce<
      Array<[K, ProductFeatureKibanaConfig<T>]>
    >((acc, [key, value]) => {
      if (enabledProductFeaturesKeys.includes(key as K)) {
        acc.push([key as K, value]);
      }
      return acc;
    }, [])
  );
