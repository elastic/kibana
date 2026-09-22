/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const escalationQueryKeys = {
  all: ['agenticInvestigations', 'escalations'] as const,
  list: (status: string) => [...escalationQueryKeys.all, 'list', status] as const,
  userProfiles: (uids: readonly string[]) =>
    [...escalationQueryKeys.all, 'profiles', uids] as const,
  suggestUsers: (term: string) => [...escalationQueryKeys.all, 'suggest', term] as const,
};
