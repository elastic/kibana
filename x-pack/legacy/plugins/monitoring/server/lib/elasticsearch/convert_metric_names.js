/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';

export const CONVERTED_TOKEN = `c_`;

export function convertMetricNames(prefix, metricObj) {
  return Object.entries(metricObj).reduce((newObj, [key, value]) => {
    const newValue = cloneDeep(value);
    if (key.includes('_deriv') && newValue.derivative) {
      newValue.derivative.buckets_path = `${CONVERTED_TOKEN}${prefix}__${newValue.derivative.buckets_path}`;
    }
    newObj[`${CONVERTED_TOKEN}${prefix}__${key}`] = newValue;
    return newObj;
  }, {});
}
