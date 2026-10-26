/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const replacementsQueryKeys = {
  root: () => ['anonymizationReplacements'] as const,
  detail: (replacementsId: string) =>
    [...replacementsQueryKeys.root(), 'detail', replacementsId] as const,
};
