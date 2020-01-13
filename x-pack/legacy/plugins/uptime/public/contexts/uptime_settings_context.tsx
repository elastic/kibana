/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { UptimeAppProps } from '../uptime_app';
import { CONTEXT_DEFAULTS } from '../../common/constants';
import { CommonlyUsedRange } from '../components/functional/uptime_date_picker';

export interface UptimeSettingsContextValues {
  basePath: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  commonlyUsedRanges?: CommonlyUsedRange[];
}

const { BASE_PATH, DATE_RANGE_START, DATE_RANGE_END } = CONTEXT_DEFAULTS;

/**
 * These are default values for the context. These defaults are typically
 * overwritten by the Uptime App upon its invocation.
 */
const defaultContext: UptimeSettingsContextValues = {
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

  const { dateRangeStart, dateRangeEnd } = useParams();

  const value = useMemo(() => {
    return {
      basePath,
      isApmAvailable,
      isInfraAvailable,
      isLogsAvailable,
      dateRangeStart: dateRangeStart ?? DATE_RANGE_START,
      dateRangeEnd: dateRangeEnd ?? DATE_RANGE_END,
    };
  }, [basePath, isApmAvailable, isInfraAvailable, isLogsAvailable, dateRangeStart, dateRangeEnd]);

  return <UptimeSettingsContext.Provider value={value} children={children} />;
};
