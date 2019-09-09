/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import numeral from '@elastic/numeral';
import moment from 'moment';

import { Series, FormatMethod } from './types';

export const getUnits = (series: Series): string => {
  const units: string = get(series, '.metric.units', 'B');
  return units !== 'B' ? units : '';
};

export const formatTicksValues = (series: Series): FormatMethod => {
  const format: string = get(series, '.metric.format', '0,0.0');
  return (val: number) => `${numeral(val).format(format)} ${getUnits(series)}`;
};

export const formatTimeValues: FormatMethod = (val: number) => `${moment.utc(val).format('HH:mm')}`;

export const getTitle = (series: Series[]): string => {
  for (const s of series) {
    const { metric } = s;
    const { title, label } = metric;
    const sTitle = title || label;
    if (sTitle) {
      return sTitle;
    }
  }
  return '';
};
