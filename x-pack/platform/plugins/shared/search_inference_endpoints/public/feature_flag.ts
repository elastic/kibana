/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { INFERENCE_PREFERENCES_FEATURE_FLAG_ID } from '../common/constants';

export const useInferencePreferencesEnabled = (): boolean => {
  try {
    return useUiSetting<boolean>(INFERENCE_PREFERENCES_FEATURE_FLAG_ID, false);
  } catch {
    return false;
  }
};
