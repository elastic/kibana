/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ruleKeys = {
  all: ['rule'] as const,
  lists: () => [...ruleKeys.all, 'list'] as const,
  list: (filters: { page: number; perPage: number }) => [...ruleKeys.lists(), filters] as const,
  detail: (id: string) => [...ruleKeys.all, 'detail', id] as const,
  create: () => [...ruleKeys.all, 'create'] as const,
  update: () => [...ruleKeys.all, 'update'] as const,
  delete: () => [...ruleKeys.all, 'delete'] as const,
};
