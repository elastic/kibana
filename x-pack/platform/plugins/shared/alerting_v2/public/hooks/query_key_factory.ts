/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ruleKeys = {
  all: ['rule'] as const,
  lists: () => [...ruleKeys.all, 'list'] as const,
  details: () => [...ruleKeys.all, 'details'] as const,
  detail: (ruleId: string) => [...ruleKeys.details(), ruleId] as const,
};
