/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';

import { TimeBuckets } from './time_buckets';

/**
 * Custom hook to get `TimeBuckets` configured with settings from the `IUiSettingsClient`.
 *
 * @param uiSettings The UI settings client instance used to retrieve UI settings.
 * @returns  A memoized `TimeBuckets` instance configured with relevant UI settings.
 */
export const useTimeBuckets = (uiSettings: IUiSettingsClient) => {
  return useMemo(() => {
    return new TimeBuckets({
      [UI_SETTINGS.HISTOGRAM_MAX_BARS]: uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      [UI_SETTINGS.HISTOGRAM_BAR_TARGET]: uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
  }, [uiSettings]);
};
