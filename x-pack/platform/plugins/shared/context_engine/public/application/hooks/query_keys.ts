/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiLifecycleStatus } from '../../../common/step_types/ki';
import type { KiStatus } from '../../../common/ki_lifecycle_status';
import type { KiListSort } from '../../../common/ki_list_sort';

export const contextEngineQueryKeys = {
  aiIndex: {
    list: () => ['context_engine', 'ai_index', 'list'] as const,
    detail: (aiIndexId: string) => ['context_engine', 'ai_index', aiIndexId] as const,
    dreaming: (aiIndexId: string) => ['context_engine', 'ai_index', aiIndexId, 'dreaming'] as const,
    listKi: (
      aiIndexId: string,
      size: number,
      type: string | undefined,
      query: string | undefined,
      status?: readonly KiStatus[],
      sort?: KiListSort,
      excludeTypes?: readonly string[]
    ) =>
      [
        'context_engine',
        'ai_index',
        aiIndexId,
        'list_ki',
        size,
        type ?? '',
        query ?? '',
        status?.join(',') ?? '',
        sort ?? '',
        // An array, not a joined string: type names may contain commas.
        excludeTypes !== undefined ? [...excludeTypes].sort() : [],
      ] as const,
    // Under the `list_ki` prefix, so the KI edit / delete / restore invalidation refreshes it too.
    listKiGroups: (
      aiIndexId: string,
      maxGroups: number,
      previewSize: number,
      query: string | undefined,
      status: readonly KiStatus[],
      sort: KiListSort,
      types?: readonly string[],
      excludeTypes?: readonly string[]
    ) =>
      [
        'context_engine',
        'ai_index',
        aiIndexId,
        'list_ki',
        '_groups',
        maxGroups,
        previewSize,
        query ?? '',
        status.join(','),
        sort,
        // Arrays, not joined strings: type names may contain commas.
        types !== undefined ? [...types] : [],
        excludeTypes !== undefined ? [...excludeTypes].sort() : [],
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
  dreamingTemplates: {
    list: () => ['context_engine', 'dreaming_templates', 'list'] as const,
  },
  spend: {
    aiIndex: (aiIndexId: string) => ['context_engine', 'spend', 'ai_index', aiIndexId] as const,
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
