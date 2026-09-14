/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queryKeys } from '../query_keys';

export const classicAlertQueryKeys = {
  all: () => [...queryKeys.all, 'classic-alert'] as const,
  alert: (alertId: string) => [...classicAlertQueryKeys.all(), alertId] as const,
};
