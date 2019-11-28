/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

import { unitsMap } from '@elastic/datemath';

export const leastCommonInterval = (num = 0, base = 0) => Math.max(Math.ceil(num / base) * base, base);
export const isCalendarInterval = ({ unit, value }) => value === 1 && ['calendar', 'mixed'].includes(unitsMap[unit].type);
