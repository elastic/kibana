/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MlFilterListsUsage {
  total_filter_list_count: number;
  total_filter_item_count: number;
  avg_items_per_filter_list: number;
  empty_filter_list_count: number;
  filter_lists_used_in_rules_count: number;
}

export const emptyFilterListsUsage = (): MlFilterListsUsage => ({
  total_filter_list_count: 0,
  total_filter_item_count: 0,
  avg_items_per_filter_list: 0,
  empty_filter_list_count: 0,
  filter_lists_used_in_rules_count: 0,
});

export function aggregateFilterListsUsage(
  filters: ReadonlyArray<{ filter_id: string; items: ReadonlyArray<string> }>,
  jobs: ReadonlyArray<{
    analysis_config?: {
      detectors?: ReadonlyArray<{
        custom_rules?: ReadonlyArray<{
          scope?: Readonly<Record<string, { filter_id?: string } | undefined>>;
        }>;
      }>;
    };
  }>
): MlFilterListsUsage {
  const totalItems = filters.reduce((sum, f) => sum + f.items.length, 0);
  const emptyCount = filters.filter((f) => f.items.length === 0).length;
  const avg = filters.length > 0 ? Math.round((totalItems / filters.length) * 100) / 100 : 0;

  const knownIds = new Set(filters.map((f) => f.filter_id));
  const referencedIds = new Set<string>();

  for (const job of jobs) {
    for (const detector of job.analysis_config?.detectors ?? []) {
      for (const rule of detector.custom_rules ?? []) {
        for (const entry of Object.values(rule.scope ?? {})) {
          if (entry?.filter_id !== undefined) {
            referencedIds.add(entry.filter_id);
          }
        }
      }
    }
  }

  const usedInRulesCount = [...referencedIds].filter((id) => knownIds.has(id)).length;

  return {
    total_filter_list_count: filters.length,
    total_filter_item_count: totalItems,
    avg_items_per_filter_list: avg,
    empty_filter_list_count: emptyCount,
    filter_lists_used_in_rules_count: usedInRulesCount,
  };
}
