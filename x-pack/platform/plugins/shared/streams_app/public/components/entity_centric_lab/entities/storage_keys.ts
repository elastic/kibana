/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared localStorage key constants for the entity-centric lab prototype.
 *
 * These keys are consumed by both `all_entities_view.tsx` (persisted hooks)
 * and `use_saved_views.ts` (`applyViewToStorage`). Centralised here so the
 * two modules can never drift out of sync.
 */

export const CATEGORY_TAB_STORAGE_KEY = 'entityCentricLab.categoryTab.v1';
export const TAG_FILTERS_STORAGE_KEY = 'entityCentricLab.entitiesTagFilters.v1';
export const VIEW_MODE_STORAGE_KEY = 'entityCentricLab.entitiesViewMode.v1';
export const GROUP_BY_STORAGE_KEY = 'entityCentricLab.entitiesGroupBy.v1';
export const PAGE_SIZE_STORAGE_KEY = 'entityCentricLab.entitiesPageSize.v1';
/** Per-table page sizes map: `Record<tableKey, size>`. */
export const PAGE_SIZES_STORAGE_KEY = 'entityCentricLab.entitiesPageSizes.v1';

export const PAGE_SIZE_CHANGE_EVENT = 'entity-centric-lab:page-size-changed';
const VALID_PAGE_SIZES = [10, 25, 50] as const;
const DEFAULT_PAGE_SIZE = VALID_PAGE_SIZES[0];

const isValidPageSize = (n: number): boolean =>
  (VALID_PAGE_SIZES as readonly number[]).includes(n);

// ---------------------------------------------------------------------------
// Legacy single-value helpers (kept for backward compat with older saved views
// that stored a single `pageSize` number).
// ---------------------------------------------------------------------------

export const readPageSize = (): number => {
  if (typeof window === 'undefined') return DEFAULT_PAGE_SIZE;
  try {
    const raw = window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    return isValidPageSize(n) ? n : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
};

export const writePageSize = (size: number): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
    window.dispatchEvent(new Event(PAGE_SIZE_CHANGE_EVENT));
  } catch {
    // Storage blocked / quota exceeded.
  }
};

// ---------------------------------------------------------------------------
// Per-table page sizes — each table on the page gets its own entry keyed by
// a stable identifier (e.g. `hosts`, `kubernetes:Pod`, bucket key).
// ---------------------------------------------------------------------------

export const readPageSizes = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PAGE_SIZES_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'number' && isValidPageSize(value)) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
};

export const writePageSizes = (sizes: Record<string, number>): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PAGE_SIZES_STORAGE_KEY, JSON.stringify(sizes));
    window.dispatchEvent(new Event(PAGE_SIZE_CHANGE_EVENT));
  } catch {
    // Storage blocked / quota exceeded.
  }
};

/** Read a single table's page size from the map; falls back to 10. */
export const readPageSizeForTable = (tableKey: string): number =>
  readPageSizes()[tableKey] ?? DEFAULT_PAGE_SIZE;

/** Whether the user has explicitly set a page size for this table. */
export const hasStoredPageSize = (tableKey: string): boolean =>
  readPageSizes()[tableKey] !== undefined;

/** Write a single table's page size into the map. */
export const writePageSizeForTable = (tableKey: string, size: number): void => {
  const sizes = readPageSizes();
  sizes[tableKey] = size;
  writePageSizes(sizes);
};
