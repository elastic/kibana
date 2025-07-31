/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const root = 'reporting';
export const queryKeys = {
  getScheduledList: (params: unknown) => [root, 'scheduledList', params] as const,
  getHealth: () => [root, 'health'] as const,
  getUserProfile: () => [root, 'userProfile'] as const,
};
