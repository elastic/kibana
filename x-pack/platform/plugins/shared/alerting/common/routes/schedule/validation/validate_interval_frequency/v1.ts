/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { INTERVAL_FREQUENCY_REGEXP } from '../../constants';

export function validateIntervalAndFrequency(every: string) {
  const everyRegexp = new RegExp(INTERVAL_FREQUENCY_REGEXP, 'g');

  if (!everyRegexp.test(every)) {
    return `'every' string of recurring schedule is not valid : ${every}`;
  }

  const parsedEvery = dateMath.parse(`now-${every}`);
  if (!parsedEvery || !parsedEvery.isValid()) {
    return `Invalid 'every' field conversion to date.`;
  }

  return;
}
