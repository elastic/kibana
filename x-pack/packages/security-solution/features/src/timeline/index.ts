/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimelineBaseKibanaFeature } from './kibana_features';
import type { ProductFeatureParams } from '../types';

export const getTimelineFeature = (): ProductFeatureParams => ({
  baseKibanaFeature: getTimelineBaseKibanaFeature(),
  baseKibanaSubFeatureIds: [],
  subFeaturesMap: new Map(),
});
