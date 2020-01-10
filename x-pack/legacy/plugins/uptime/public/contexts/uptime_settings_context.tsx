/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import React, { createContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { UptimeAppProps } from '../uptime_app';
import { CONTEXT_DEFAULTS } from '../../common/constants';
import { CommonlyUsedRange } from '../components/functional/uptime_date_picker';

export interface UMSettingsContextValues {
  absoluteStartDate: number;
  absoluteEndDate: number;
  autorefreshIsPaused: boolean;
  autorefreshInterval: number;
  basePath: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  commonlyUsedRanges?: CommonlyUsedRange[];
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
  dateRangeStart: DATE_RANGE_START,
  dateRangeEnd: DATE_RANGE_END,
  isApmAvailable: true,
  isInfraAvailable: true,
  isLogsAvailable: true,
};
export const UptimeSettingsContext = createContext(defaultContext);

export const UptimeSettingsContextProvider: React.FC<UptimeAppProps> = ({ children, ...props }) => {
  const { basePath, isApmAvailable, isInfraAvailable, isLogsAvailable } = props;

  const { autorefreshInterval, autorefreshIsPaused, dateRangeStart, dateRangeEnd } = useParams();

  const value = useMemo(() => {
    const absoluteStartDate = DateMath.parse(dateRangeStart ?? '');
    const absoluteEndDate = DateMath.parse(dateRangeEnd ?? '');
    return {
      absoluteStartDate: absoluteStartDate ? absoluteStartDate.valueOf() : 0,
      absoluteEndDate: absoluteEndDate ? absoluteEndDate.valueOf() : 1,
      autorefreshInterval,
      autorefreshIsPaused,
      basePath,
      dateRangeStart,
      dateRangeEnd,
      isApmAvailable,
      isInfraAvailable,
      isLogsAvailable,
    };
  }, [
    autorefreshInterval,
    autorefreshIsPaused,
    dateRangeStart,
    dateRangeEnd,
    basePath,
    isApmAvailable,
    isInfraAvailable,
    isLogsAvailable,
  ]);

  return <UptimeSettingsContext.Provider value={value} children={children} />;
};
