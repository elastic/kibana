/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AGG_TYPE } from '../../../common/constants';

export function isMetricCountable(aggType: AGG_TYPE): boolean {
  return [AGG_TYPE.COUNT, AGG_TYPE.SUM, AGG_TYPE.UNIQUE_COUNT].includes(aggType);
}
