/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Duration } from '@elastic/elasticsearch/lib/api/types';
import { TIME_UNITS } from '../constants';

export const deserializeTime = (time: Duration) => {
  const timeUnits = Object.values(TIME_UNITS);

  if (typeof time !== 'string') {
    // Apart from string, time can be -1 or 0. In those cases, we take them as invalid/empty times.
    return {};
  }

  const timeUnit = timeUnits.find((unit) => {
    const unitIndex = time.indexOf(unit);
    return unitIndex !== -1 && unitIndex === time.length - 1;
  });

  if (timeUnit) {
    const timeValue = Number(time.replace(timeUnit, ''));

    if (!isNaN(timeValue)) {
      return {
        timeValue,
        timeUnit,
      };
    }
  }

  return {};
};

export const serializeTime = (timeValue: number, timeUnit: string) => {
  return `${timeValue}${timeUnit}`; // e.g., '15d'
};
