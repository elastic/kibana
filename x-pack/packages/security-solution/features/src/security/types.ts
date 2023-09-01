/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppFeatureSecurityKey, SecuritySubFeatureId } from '../app_features_keys';
import type { AppFeatureKibanaConfig } from '../types';

export interface SecurityFeatureParams {
  experimentalFeatures: Record<string, boolean>;
  savedObjects: string[];
}

export type DefaultSecurityAppFeaturesConfig = Omit<
  Record<AppFeatureSecurityKey, AppFeatureKibanaConfig<SecuritySubFeatureId>>,
  AppFeatureSecurityKey.endpointExceptions
  // | add not default security app features here
>;
