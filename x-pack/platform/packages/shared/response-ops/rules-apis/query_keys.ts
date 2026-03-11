/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const queryKeys = {
  root: 'rules',
  getRuleTags: ({
    ruleTypeIds,
    search,
    perPage,
    page,
    refresh,
  }: {
    ruleTypeIds?: string[];
    search?: string;
    perPage?: number;
    page: number;
    refresh?: Date;
  }) =>
    [
      queryKeys.root,
      'getRuleTags',
      ruleTypeIds,
      search,
      perPage,
      page,
      {
        refresh: refresh?.toISOString(),
      },
    ] as const,
  getRuleTypes: () => [queryKeys.root, 'getRuleTypes'] as const,
  getInternalRuleTypes: () => [queryKeys.root, 'getInternalRuleTypes'] as const,
};
