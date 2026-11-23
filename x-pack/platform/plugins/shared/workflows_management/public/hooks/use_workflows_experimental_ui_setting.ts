/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/workflows/common/constants';

export const useWorkflowsExperimentalUiSetting = (
  settingId: string,
  defaultValue = false
): boolean => {
  const experimentalFeaturesEnabled = useUiSetting<boolean>(
    WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID,
    false
  );
  const settingEnabled = useUiSetting<boolean>(settingId, defaultValue);

  return experimentalFeaturesEnabled && settingEnabled;
};
