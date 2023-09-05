/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CasesSubFeatureId } from '../app_features_keys';
import type { AppFeatureParams } from '../types';
import { getCasesBaseKibanaFeature } from './kibana_features';
import { getCasesBaseKibanaSubFeatureIds, getCasesSubFeaturesMap } from './kibana_sub_features';
import type { CasesFeatureParams } from './types';

export const getCasesFeature = (
  params: CasesFeatureParams
): AppFeatureParams<CasesSubFeatureId> => ({
  baseKibanaFeature: getCasesBaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getCasesBaseKibanaSubFeatureIds(),
  subFeaturesMap: getCasesSubFeaturesMap(params),
});
