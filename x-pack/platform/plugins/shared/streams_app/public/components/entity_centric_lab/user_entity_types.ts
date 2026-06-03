/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * In-memory + `localStorage`-backed store of entity types created by the
 * user via the "Create entity type" wizard. Sits alongside the hardcoded
 * {@link FAKE_ENTITY_TYPES} catalogue: the Manage page concatenates both
 * to build the table, and any per-row store keyed by `FakeEntityType.id`
 * (e.g. wizard-local draft persistence) keeps working unchanged because
 * the synthetic ids are unique across both sources.
 *
 * Uses the same pub-sub pattern as `flyout_template_overrides` so the
 * Manage table re-renders the moment a new row is registered, without
 * needing the consumer to re-mount.
 */

import { useSyncExternalStore } from 'react';
import type { FakeEntityType } from './fake_entity_types';

const STORAGE_KEY = 'entityCentricLab.userEntityTypes.v1';

let cache: FakeEntityType[] = [];
let hasHydrated = false;
const listeners = new Set<() => void>();

const readStorage = (): FakeEntityType[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Light sanity check: drop anything missing the required `id` so the
    // table never renders a row that breaks downstream lookups.
    return parsed.filter(
      (entry): entry is FakeEntityType =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        typeof (entry as FakeEntityType).id === 'string'
    );
  } catch {
    return [];
  }
};

const writeStorage = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Out of quota or storage blocked — in-memory cache still serves
    // the rest of the session.
  }
};

const hydrateOnce = (): void => {
  if (hasHydrated) return;
  hasHydrated = true;
  cache = readStorage();
};

const emit = (): void => {
  // Snapshot iteration so a listener that unsubscribes itself can't
  // perturb the loop.
  for (const listener of [...listeners]) listener();
};

/**
 * Append a brand-new entity type to the user-created store. Triggers a
 * re-render in every consumer of {@link useUserEntityTypes}.
 */
export const addUserEntityType = (entityType: FakeEntityType): void => {
  hydrateOnce();
  cache = [...cache, entityType];
  writeStorage();
  emit();
};

/** Synchronous accessor (used by deep-link resolution on the Manage page). */
export const getUserEntityTypes = (): readonly FakeEntityType[] => {
  hydrateOnce();
  return cache;
};

/**
 * Subscribe to user-types-store updates. Returns an unsubscribe handle
 * suitable for {@link useSyncExternalStore}.
 */
export const subscribeUserEntityTypes = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * React hook returning the current list of user-created entity types,
 * re-rendering on every {@link addUserEntityType} call.
 */
export const useUserEntityTypes = (): readonly FakeEntityType[] =>
  useSyncExternalStore(subscribeUserEntityTypes, getUserEntityTypes, getUserEntityTypes);
