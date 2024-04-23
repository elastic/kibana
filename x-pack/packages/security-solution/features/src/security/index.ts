/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SecuritySubFeatureId } from '../product_features_keys';
import type { ProductFeatureParams } from '../types';
import { getSecurityBaseKibanaFeature } from './kibana_features';
import { securitySubFeaturesMap, getSecurityBaseKibanaSubFeatureIds } from './kibana_sub_features';
import type { SecurityFeatureParams } from './types';

export const getSecurityFeature = (
  params: SecurityFeatureParams
): ProductFeatureParams<SecuritySubFeatureId> => ({
  baseKibanaFeature: getSecurityBaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getSecurityBaseKibanaSubFeatureIds(params),
  subFeaturesMap: securitySubFeaturesMap,
});
