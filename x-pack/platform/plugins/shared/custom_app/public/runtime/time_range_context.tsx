/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { TimeRange } from '@kbn/es-query';

/**
 * What changing the period of the app means is up to where it is shown: on a page or in a chat card
 * it is the period of the app, and in a panel of a dashboard it is the period of the panel, which
 * is then its own and no longer the dashboard's. The host says how, and the component that asks for
 * it does not need to know.
 */
export interface TimeRangeControl {
  setTimeRange: (timeRange: TimeRange) => void;
}

export const TimeRangeControlContext = createContext<TimeRangeControl | undefined>(undefined);

/** Where the period can be changed, if it can be where the app is shown. */
export const useTimeRangeControl = (): TimeRangeControl | undefined =>
  useContext(TimeRangeControlContext);
