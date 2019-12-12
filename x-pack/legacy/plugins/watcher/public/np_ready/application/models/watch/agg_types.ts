/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AGG_TYPES } from '../../../../../common/constants';

export interface AggType {
  text: string;
  fieldRequired: boolean;
  value: string;
  validNormalizedTypes: string[];
}
export const aggTypes: { [key: string]: AggType } = {
  count: {
    text: 'count()',
    fieldRequired: false,
    value: AGG_TYPES.COUNT,
    validNormalizedTypes: [],
  },
  avg: {
    text: 'average()',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: AGG_TYPES.AVERAGE,
  },
  sum: {
    text: 'sum()',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: AGG_TYPES.SUM,
  },
  min: {
    text: 'min()',
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGG_TYPES.MIN,
  },
  max: {
    text: 'max()',
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGG_TYPES.MAX,
  },
};
