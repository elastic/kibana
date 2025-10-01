/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALLOWED_MAX_ALERTS = 5000;

export function getMaxAlertLimit(maxAlerts: number): number {
  return Math.min(maxAlerts, ALLOWED_MAX_ALERTS);
}
