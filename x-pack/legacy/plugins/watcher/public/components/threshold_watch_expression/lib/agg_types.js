/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AGG_TYPES } from 'plugins/watcher/../common/constants';

export const aggTypes = {
  count: {
    label: 'count()',
    fieldRequired: false,
    value: AGG_TYPES.COUNT
  },
  average: {
    label: 'average()',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: AGG_TYPES.AVERAGE
  },
  sum: {
    label: 'sum()',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: AGG_TYPES.SUM
  },
  min: {
    label: 'min()',
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGG_TYPES.MIN
  },
  max: {
    label: 'max()',
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGG_TYPES.MAX
  }
};
