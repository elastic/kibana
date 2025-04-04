/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnomalyDateFunction, MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils/types';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { formatTimeValue } from '../../formatters/format_value';
import { useFieldFormatter } from '../../contexts/kibana';

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
export function useTimeValueInfo(
  value: number,
  functionName: string,
  record?: MlAnomalyRecordDoc
): TimeValueInfo | null {
  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);

  if (!isTimeFunction(functionName)) {
    return null;
  }

  const result = formatTimeValue(value, functionName, record);

  // Create a more detailed tooltip format using the moment object
  const tooltipContent = dateFormatter(result.moment.valueOf());

  return {
    formattedTime: result.formatted,
    tooltipContent,
    dayOffset: result.dayOffset,
  };
}
