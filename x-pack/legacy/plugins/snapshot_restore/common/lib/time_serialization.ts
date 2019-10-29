/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIME_UNITS } from '../constants';

export const deserializeTime = (time: string) => {
  const timeUnits = Object.values(TIME_UNITS);

  const timeUnit = timeUnits.find(unit => {
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
