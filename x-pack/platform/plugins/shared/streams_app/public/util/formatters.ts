/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getPercentageFormatter(opts?: { precision: number }): Intl.NumberFormat {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: opts?.precision ?? 1,
  });
}
