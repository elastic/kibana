/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useService, CoreStart } from '@kbn/core-di-browser';
import {
  ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID,
  ALERTING_V2_RULE_DOCTOR_INTERVAL_SETTING_ID,
} from '../../common/advanced_settings';

interface ExperimentalSettings {
  experimentalFeaturesEnabled: boolean;
  ruleDoctorContinuousAnalysis: boolean;
  ruleDoctorIntervalHours: number | null;
}

export const useExperimentalSettings = (): ExperimentalSettings => {
  const uiSettings = useService(CoreStart('uiSettings'));

  const experimentalFeaturesEnabled = uiSettings.get<boolean>(
    ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID,
    false
  );

  return useMemo(() => {
    if (!experimentalFeaturesEnabled) {
      return {
        experimentalFeaturesEnabled: false,
        ruleDoctorContinuousAnalysis: false,
        ruleDoctorIntervalHours: null,
      };
    }

    const intervalHours = uiSettings.get<number | null>(
      ALERTING_V2_RULE_DOCTOR_INTERVAL_SETTING_ID,
      null
    );

    return {
      experimentalFeaturesEnabled: true,
      ruleDoctorContinuousAnalysis: intervalHours !== null,
      ruleDoctorIntervalHours: intervalHours,
    };
  }, [experimentalFeaturesEnabled, uiSettings]);
};

export const useExperimentalFeaturesEnabled = (): boolean => {
  const { experimentalFeaturesEnabled } = useExperimentalSettings();
  return experimentalFeaturesEnabled;
};
