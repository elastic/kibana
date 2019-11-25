/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTimeUnitLabel } from './get_time_unit_label';
import { TIME_UNITS } from '../constants';

export const getTimeOptions = (unitSize: string) =>
  Object.entries(TIME_UNITS).map(([_key, value]) => {
    return {
      text: getTimeUnitLabel(value, unitSize),
      value,
    };
  });

export const getTimeFieldOptions = (fields: any, firstFieldOption: any) => {
  const options = [firstFieldOption];

  fields.forEach((field: any) => {
    if (field.type === 'date') {
      options.push({
        text: field.name,
        value: field.name,
      });
    }
  });
  return options;
};
