/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AbsoluteTimeRange } from '@kbn/es-query';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function getLast24HoursTimeRange(now = Date.now()): AbsoluteTimeRange {
  return {
    from: new Date(now - ONE_DAY_MS).toISOString(),
    to: new Date(now).toISOString(),
    mode: 'absolute',
  };
}
