/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnomalyDateFunction, MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils/types';
import { formatTimeValue } from '../../formatters/format_value';

interface TimeValueInfo {
  formattedTime: string;
  tooltipContent: string;
  dayOffset?: number;
}

/**
 * Type guard to check if a function is a time-based function
 */
export function isTimeFunction(functionName?: string): functionName is AnomalyDateFunction {
  return functionName === 'time_of_day' || functionName === 'time_of_week';
}

/**
 * Gets formatted time information for time-based functions
 */
export function getTimeValueInfo(
  value: number,
  functionName: AnomalyDateFunction,
  record?: MlAnomalyRecordDoc
): TimeValueInfo {
  const result = formatTimeValue(value, functionName, record);

  // Create a more detailed tooltip format using the moment object
  const tooltipContent = result.moment.format('dddd, MMMM Do HH:mm');

  return {
    formattedTime: result.formatted,
    tooltipContent,
    dayOffset: result.dayOffset,
  };
}
