/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_UNITS } from './constants';
import * as i18n from './translations';

export const getTimeUnitOptions = (unitSize: string) => {
  return Object.entries(TIME_UNITS).map(([_key, value]) => {
    return {
      text: getTimeUnitLabels(value, unitSize === '' ? '0' : unitSize),
      value,
    };
  });
};

export const getTimeUnitLabels = (timeUnit = TIME_UNITS.DAYS, timeValue = '0') => {
  switch (timeUnit) {
    case TIME_UNITS.DAYS:
      return i18n.DAYS(timeValue);
    case TIME_UNITS.WEEKS:
      return i18n.WEEKS(timeValue);
  }
};
