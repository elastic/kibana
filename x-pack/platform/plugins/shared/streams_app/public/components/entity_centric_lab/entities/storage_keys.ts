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

export const PAGE_SIZE_CHANGE_EVENT = 'entity-centric-lab:page-size-changed';
const VALID_PAGE_SIZES = [10, 25, 50] as const;

export const readPageSize = (): number => {
  if (typeof window === 'undefined') return VALID_PAGE_SIZES[0];
  try {
    const raw = window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    return (VALID_PAGE_SIZES as readonly number[]).includes(n) ? n : VALID_PAGE_SIZES[0];
  } catch {
    return VALID_PAGE_SIZES[0];
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
