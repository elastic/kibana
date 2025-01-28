/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantScope } from '../types';

export function filterScopes<T extends { scopes?: AssistantScope[] }>(
  scopeFilters?: AssistantScope[]
) {
  return function (value: T): boolean {
    if (!scopeFilters || !value) {
      return true;
    }
    return value?.scopes
      ? value.scopes.some((scope) => [...scopeFilters, 'all'].includes(scope))
      : true;
  };
}
