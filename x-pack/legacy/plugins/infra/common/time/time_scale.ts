/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeUnit, timeUnitLabels } from './time_unit';

export interface TimeScale {
  unit: TimeUnit;
  value: number;
}

export const getMillisOfScale = (scale: TimeScale) => scale.unit * scale.value;

export const getLabelOfScale = (scale: TimeScale) => `${scale.value}${timeUnitLabels[scale.unit]}`;

export const decomposeIntoUnits = (time: number, units: TimeUnit[]) =>
  units.reduce<TimeScale[]>((result, unitMillis) => {
    const offset = result.reduce(
      (accumulatedOffset, timeScale) => accumulatedOffset + getMillisOfScale(timeScale),
      0
    );
    const value = Math.floor((time - offset) / unitMillis);

    if (value > 0) {
      return [
        ...result,
        {
          unit: unitMillis,
          value,
        },
      ];
    } else {
      return result;
    }
  }, []);
