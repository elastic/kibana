/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { METRIC_TYPE } from '../../../common/constants';

export function isMetricCountable(aggType) {
  return [METRIC_TYPE.COUNT, METRIC_TYPE.SUM, METRIC_TYPE.UNIQUE_COUNT].includes(aggType);
}
