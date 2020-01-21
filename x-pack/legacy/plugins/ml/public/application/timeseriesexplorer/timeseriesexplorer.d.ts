/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FC } from 'react';

import { Timefilter } from 'ui/timefilter';

import { getDateFormatTz, TimeRangeBounds } from '../explorer/explorer_utils';

declare const TimeSeriesExplorer: FC<{
  appStateHandler: (action: string, payload: any) => void;
  autoZoomDuration: number;
  bounds: TimeRangeBounds;
  dateFormatTz: string;
  lastRefresh: number;
  selectedJobId: string;
  selectedDetectorIndex: number;
  selectedEntities: any[];
  selectedForecastId: string;
  setGlobalState: (arg: any) => void;
  tableInterval: string;
  tableSeverity: number;
  zoom?: { from: string; to: string };
}>;
