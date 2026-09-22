/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const queryKeys = {
  proposals: {
    all: ['agenticInvestigations', 'proposals'] as const,
    list: (conversationId?: string) =>
      [...queryKeys.proposals.all, 'list', conversationId ?? 'any'] as const,
    detail: (id: string | undefined) => [...queryKeys.proposals.all, 'detail', id] as const,
  },
};
