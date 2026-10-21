/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const queryKeys = {
  proposals: {
    all: ['proposals'] as const,
    list: (conversationId?: string) =>
      [...queryKeys.proposals.all, 'list', conversationId ?? 'any'] as const,
    /** Distinct from `list`: that one is always `status: 'pending'`, this one is every status. */
    forConversation: (conversationId: string) =>
      [...queryKeys.proposals.all, 'conversation', conversationId] as const,
    detail: (id: string | undefined) => [...queryKeys.proposals.all, 'detail', id] as const,
  },
  userProfiles: {
    all: ['proposals', 'userProfiles'] as const,
    current: () => [...queryKeys.userProfiles.all, 'current'] as const,
  },
};

/**
 * Fixed per decision type rather than per proposal: a mutation's *key* identifies which
 * operation it is, and `useIsMutating`'s `predicate` narrows an in-flight one down to a specific
 * proposal by its call-time `variables.id` — see `useIsApprovingProposal`/`useIsDecliningProposal`.
 */
export const mutationKeys = {
  proposals: {
    approve: ['proposals', 'approve'] as const,
    decline: ['proposals', 'decline'] as const,
  },
};
