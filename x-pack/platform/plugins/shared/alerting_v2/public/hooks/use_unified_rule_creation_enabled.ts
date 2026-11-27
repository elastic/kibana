/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, useService } from '@kbn/core-di-browser';
import { UNIFIED_RULE_CREATION_FEATURE_FLAG } from '../../common/feature_flags';

/** Whether the unified rule creation feature flag is on. */
export const useUnifiedRuleCreationEnabled = (): boolean => {
  const featureFlags = useService(CoreStart('featureFlags'));

  return featureFlags.useBooleanValue(UNIFIED_RULE_CREATION_FEATURE_FLAG, false);
};
