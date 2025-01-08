/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LEGEND_TYPES = {
  NOMINAL: 'nominal',
  QUANTITATIVE: 'quantitative',
} as const;
export type LegendType = (typeof LEGEND_TYPES)[keyof typeof LEGEND_TYPES];
