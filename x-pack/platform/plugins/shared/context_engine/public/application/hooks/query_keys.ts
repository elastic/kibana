/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiLifecycleStatus } from '../../../common/step_types/ki';

export const contextEngineQueryKeys = {
  aiIndex: {
    list: () => ['context_engine', 'ai_index', 'list'] as const,
    detail: (aiIndexId: string) => ['context_engine', 'ai_index', aiIndexId] as const,
    listKi: (
      aiIndexId: string,
      size: number,
      type: string | undefined,
      lifecycleStatus: readonly KiLifecycleStatus[]
    ) =>
      [
        'context_engine',
        'ai_index',
        aiIndexId,
        'list_ki',
        size,
        type ?? '',
        lifecycleStatus.join(','),
      ] as const,
    viewKi: (
      aiIndexId: string,
      index: string,
      kiId: string,
      lifecycleStatus: readonly KiLifecycleStatus[]
    ) =>
      [
        'context_engine',
        'ai_index',
        aiIndexId,
        'ki',
        index,
        kiId,
        lifecycleStatus.join(','),
      ] as const,
  },
  connectors: {
    list: () => ['context_engine', 'connectors', 'list'] as const,
    types: () => ['context_engine', 'connectors', 'types'] as const,
  },
  indices: {
    list: (search: string) => ['context_engine', 'indices', 'list', search] as const,
  },
  signals: {
    groups: () => ['context_engine', 'signals', 'groups'] as const,
    byTag: (tag: string, from: number, size: number) =>
      ['context_engine', 'signals', 'by_tag', tag, from, size] as const,
  },
};
