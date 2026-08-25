/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { random } from 'lodash';

const dataCounts: Record<string, number> = {};

export function generateCounterData(id: string, count: number, interval: number) {
  const currentCount = dataCounts[id] || 0;
  const countPerInterval = count || random(10000, 100000);
  const newCount = currentCount + countPerInterval * (interval / 1000);
  dataCounts[id] = newCount;
  return newCount;
}
