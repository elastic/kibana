/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Matches left-nav inventory badges: full number through 9999, then `10k` / `10k+`. */
export const formatInventoryNavCount = (count: number): string => {
  if (count > 10000) return '10k+';
  if (count >= 10000) return '10k';
  return count.toLocaleString();
};

export const formatInventoryAlertRatioLabel = (alerting: number, total: number): string =>
  `${formatInventoryNavCount(alerting)}/${formatInventoryNavCount(total)}`;
