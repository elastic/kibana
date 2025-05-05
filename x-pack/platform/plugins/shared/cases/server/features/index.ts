/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { getV1 } from './v1';
import { getV2 } from './v2';
import { getV3 } from './v3';

export const getCasesKibanaFeatures = (): {
  v1: KibanaFeatureConfig;
  v2: KibanaFeatureConfig;
  v3: KibanaFeatureConfig;
} => ({ v1: getV1(), v2: getV2(), v3: getV3() });
