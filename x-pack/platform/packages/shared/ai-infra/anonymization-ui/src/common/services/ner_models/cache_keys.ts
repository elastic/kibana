/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const normalizeModelIds = (modelIds: string[]) =>
  Array.from(new Set(modelIds.map((id) => id.trim()).filter(Boolean))).sort();

export const nerModelsQueryKeys = {
  root: () => ['anonymizationNerModels'] as const,

  availability: (modelIds: string[]) =>
    [...nerModelsQueryKeys.root(), 'availability', normalizeModelIds(modelIds)] as const,
};
