/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { TableSeverityState } from '../components/controls/select_severity';

interface TimeSeriesExplorerProps {
  appStateHandler: (action: string, payload: any) => void;
  autoZoomDuration: number | undefined;
  bounds: TimeRangeBounds | undefined;
  lastRefresh: number;
  previousRefresh?: number;
  dateFormatTz: string;
  selectedJobId: string;
  selectedDetectorIndex?: number;
  selectedEntities?: Record<string, string>;
  selectedForecastId?: string;
  tableInterval?: string;
  tableSeverity?: TableSeverityState;
  zoom?: { from?: string; to?: string };
  handleJobSelectionChange: ({
    jobIds,
    time,
  }: {
    jobIds: string[];
    time?: { from: string; to: string };
  }) => void;
}

// eslint-disable-next-line react/prefer-stateless-function
declare class TimeSeriesExplorer extends React.Component<TimeSeriesExplorerProps> {}
