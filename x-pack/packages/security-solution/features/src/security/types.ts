/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeatureSecurityKey, SecuritySubFeatureId } from '../product_features_keys';
import type { ProductFeatureKibanaConfig } from '../types';

export interface SecurityFeatureParams {
  experimentalFeatures: Record<string, boolean>;
  savedObjects: string[];
}

export type DefaultSecurityProductFeaturesConfig = Omit<
  Record<ProductFeatureSecurityKey, ProductFeatureKibanaConfig<SecuritySubFeatureId>>,
  ProductFeatureSecurityKey.endpointExceptions
  // | add not generic security app features here
>;
