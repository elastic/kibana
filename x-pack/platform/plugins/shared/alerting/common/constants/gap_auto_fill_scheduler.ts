/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const gapAutoFillSchedulerLimits = {
  maxBackfills: {
    min: 1,
    max: 5000,
    defaultValue: 1000,
  },
  numRetries: {
    min: 1,
    max: 10,
    defaultValue: 3,
  },
} as const;
