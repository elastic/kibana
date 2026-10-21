/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const investigationQueryKeys = {
  all: ['agenticInvestigations', 'investigations'] as const,
  detail: (id: string) => [...investigationQueryKeys.all, 'detail', id] as const,
  card: (id: string) => [...investigationQueryKeys.all, 'card', id] as const,
  privileges: () => [...investigationQueryKeys.all, 'privileges'] as const,
};
