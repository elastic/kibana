/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { createContext } from 'react';
import { UptimeAppColors } from '../uptime_app';
import { CONTEXT_DEFAULTS } from '../../common/constants';

export interface UMSettingsContextValues {
  absoluteStartDate: number;
  absoluteEndDate: number;
  autorefreshIsPaused: boolean;
  autorefreshInterval: number;
  basePath: string;
  colors: UptimeAppColors;
  dateRangeStart: string;
  dateRangeEnd: string;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  refreshApp: () => void;
  setHeadingText: (text: string) => void;
}

const {
  AUTOREFRESH_IS_PAUSED,
  AUTOREFRESH_INTERVAL,
  BASE_PATH,
  DATE_RANGE_START,
  DATE_RANGE_END,
} = CONTEXT_DEFAULTS;
const parsedStart = DateMath.parse(DATE_RANGE_START);
const parsedEnd = DateMath.parse(DATE_RANGE_END);
const DEFAULT_ABSOLUTE_START_DATE = parsedStart ? parsedStart.valueOf() : 0;
const DEFAULT_ABSOLUTE_END_DATE = parsedEnd ? parsedEnd.valueOf() : 1;

/**
 * These are default values for the context. These defaults are typically
 * overwritten by the Uptime App upon its invocation.
 */
const defaultContext: UMSettingsContextValues = {
  absoluteStartDate: DEFAULT_ABSOLUTE_START_DATE,
  absoluteEndDate: DEFAULT_ABSOLUTE_END_DATE,
  autorefreshIsPaused: AUTOREFRESH_IS_PAUSED,
  autorefreshInterval: AUTOREFRESH_INTERVAL,
  basePath: BASE_PATH,
  colors: {
    danger: euiLightVars.euiColorDanger,
    mean: euiLightVars.euiColorPrimary,
    range: euiLightVars.euiFocusBackgroundColor,
    success: euiLightVars.euiColorSuccess,
    warning: euiLightVars.euiColorWarning,
    gray: euiLightVars.euiColorLightShade,
  },
  dateRangeStart: DATE_RANGE_START,
  dateRangeEnd: DATE_RANGE_END,
  isApmAvailable: true,
  isInfraAvailable: true,
  isLogsAvailable: true,
  refreshApp: () => {
    throw new Error('App refresh was not initialized, set it when you invoke the context');
  },
  setHeadingText: () => {
    throw new Error('setHeadingText was not initialized on UMSettingsContext.');
  },
};

export const UptimeSettingsContext = createContext(defaultContext);
