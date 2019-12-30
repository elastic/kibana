/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Timefilter } from 'ui/timefilter';
import { FC } from 'react';

declare const TimeSeriesExplorer: FC<{
  appStateHandler: (action: string, payload: any) => void;
  dateFormatTz: string;
  selectedJobIds: string[];
  setGlobalState: (arg: any) => void;
  tableInterval: string;
  tableSeverity: number;
  timefilter: Timefilter;
}>;
