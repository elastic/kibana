/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';

export const RRuleFrequencyMap = {
  '0': Frequency.YEARLY,
  '1': Frequency.MONTHLY,
  '2': Frequency.WEEKLY,
  '3': Frequency.DAILY,
};

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}
