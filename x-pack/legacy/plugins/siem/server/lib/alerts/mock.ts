/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultIndexPattern } from '../../../default_index_pattern';

export const mockAlertsHistogramDataResponse = 'mockAlertsHistogramDataResponse';
export const mockAlertsHistogramQueryDsl = 'mockAlertsHistogramQueryDsl';
export const mockRequest = 'mockRequest';
export const mockOptions = {
  sourceConfiguration: { field: {} },
  timerange: {
    to: 9999,
    from: 1234,
  },
  defaultIndex: defaultIndexPattern,
  filterQuery: '',
};
