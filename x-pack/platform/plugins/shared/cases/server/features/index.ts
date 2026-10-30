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
import { getV4 } from './v4';
import { withCasesV4Replacement } from './v4_replacement';

export { withCasesV4Replacement, LEGACY_CASES_FEATURE_IDS } from './v4_replacement';

export const getCasesKibanaFeatures = (): {
  v1: KibanaFeatureConfig;
  v2: KibanaFeatureConfig;
  v3: KibanaFeatureConfig;
} => ({ v1: getV1(), v2: getV2(), v3: getV3() });

/** `casesV4` plus the stack Cases features deprecated in its favor. */
export const getTopLevelAppCasesKibanaFeatures = ({
  disabledSubFeaturePrivileges,
}: {
  disabledSubFeaturePrivileges: readonly string[];
}): {
  v4: KibanaFeatureConfig;
  legacy: KibanaFeatureConfig[];
} => ({
  v4: getV4({ disabledSubFeaturePrivileges }),
  legacy: [getV1(), getV2(), getV3()].map(withCasesV4Replacement),
});
