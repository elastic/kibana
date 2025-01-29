/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDateRange } from '@kbn/timerange';
import { DEFAULT_TIME_RANGE } from '../../common/constants';
import { DataStreamStat } from '../../common/data_streams_stats';

interface FilterInactiveDatasetsOptions {
  datasets: DataStreamStat[];
  timeRange?: {
    from: string;
    to: string;
  };
}

export const filterInactiveDatasets = ({
  datasets,
  timeRange = DEFAULT_TIME_RANGE,
}: FilterInactiveDatasetsOptions) => {
  const { startDate, endDate } = getDateRange(timeRange);

  return datasets.filter((dataset) =>
    dataset.lastActivity
      ? isActive(dataset.lastActivity, startDate as number, endDate as number)
      : false
  );
};

interface IsActiveDatasetOptions {
  lastActivity: number;
  timeRange: {
    from: string;
    to: string;
  };
}

export const isActiveDataset = (options: IsActiveDatasetOptions) => {
  const { lastActivity, timeRange } = options;
  const { startDate, endDate } = getDateRange(timeRange);

  return isActive(lastActivity, startDate, endDate);
};

const isActive = (lastActivity: number, startDate: number, endDate: number) =>
  lastActivity >= startDate && lastActivity <= endDate;
