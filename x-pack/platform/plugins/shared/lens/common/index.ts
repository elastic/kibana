/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { DOCUMENT_FIELD_NAME } from './constants';
export {
  type LensFeatureFlag,
  type LensFeatureFlags,
  lensFeatureFlags,
  fetchLensFeatureFlags,
  getLensFeatureFlagDefaults,
} from './feature_flags';
export type { PersistableFilter, LegacyMetricState } from '@kbn/lens-common';
