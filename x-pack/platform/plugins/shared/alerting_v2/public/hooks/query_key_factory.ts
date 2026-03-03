/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const notificationPolicyKeys = {
  all: ['notificationPolicy'] as const,
  create: () => [...notificationPolicyKeys.all, 'create'] as const,
  update: () => [...notificationPolicyKeys.all, 'update'] as const,
  delete: () => [...notificationPolicyKeys.all, 'delete'] as const,
  detail: (id: string) => [...notificationPolicyKeys.all, 'detail', id] as const,
  lists: () => [...notificationPolicyKeys.all, 'list'] as const,
  list: (filters: { page: number; perPage: number }) =>
    [...notificationPolicyKeys.lists(), filters] as const,
};
