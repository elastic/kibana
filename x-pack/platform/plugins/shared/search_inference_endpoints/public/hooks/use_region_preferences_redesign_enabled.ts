/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REGION_PREFERENCES_REDESIGN_FEATURE_FLAG } from '../../common/constants';
import { useKibana } from './use_kibana';

export const useRegionPreferencesRedesignEnabled = (): boolean => {
  const {
    services: { featureFlags },
  } = useKibana();

  return featureFlags.getBooleanValue(REGION_PREFERENCES_REDESIGN_FEATURE_FLAG, false);
};
