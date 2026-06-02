/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wizard-local persistence for the "Manage entity types" edit flyout.
 *
 * Why this is separate from the shared `flyout_template_overrides` store:
 *   - The shared store lives in `@kbn/entity-centric-lab-flyout` and only
 *     cares about the *runtime* tab list rendered in the entity flyout
 *     (id / label / enabled). It's keyed by canonical `EntityKind` so a
 *     single override applies to every entity of that kind.
 *   - The wizard form, however, also remembers everything else the user
 *     edited — General fields, Health signals, Ownership mapping, Subsets,
 *     etc. — which is wizard-specific data the flyout package has no
 *     business knowing about. Re-opening the form should show whatever the
 *     user last saved, so we round-trip the full editable slice keyed by
 *     `FakeEntityType.id` (one persisted draft per row in the table).
 *
 * Storage: in-memory cache + `localStorage` mirror so the demo survives a
 * hard reload, matching how the shared override store behaves. No schema
 * versioning beyond the v1 storage key — bumping the key cleanly invalidates
 * stale payloads if the shape changes.
 */

import type {
  CustomLinkDraft,
  EntityTypeDraft,
  FlyoutTabConfig,
  GeneralFields,
  HealthSignals,
  OwnershipConfig,
  SubsetDraft,
} from './fake_entity_type_draft';

const STORAGE_KEY = 'entityCentricLab.editEntityTypeDrafts.v1';

/**
 * The slice of `EntityTypeDraft` that the wizard actually mutates. We
 * deliberately omit `entityType` (constant metadata seeded from
 * `FAKE_ENTITY_TYPES`, e.g. `lastUpdate`) and `coveragePreview` (computed
 * preview the user can't directly edit). Each field is optional so a draft
 * saved before a new field was added still roundtrips cleanly.
 */
export interface PersistedEntityTypeDraft {
  readonly general?: GeneralFields;
  readonly health?: HealthSignals;
  readonly ownership?: OwnershipConfig;
  readonly flyoutTabs?: readonly FlyoutTabConfig[];
  readonly customLinks?: readonly CustomLinkDraft[];
  readonly subsets?: readonly SubsetDraft[];
}

const cache = new Map<string, PersistedEntityTypeDraft>();
let hasHydrated = false;

const readStorage = (): Record<string, PersistedEntityTypeDraft> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, PersistedEntityTypeDraft>;
  } catch {
    return {};
  }
};

const writeStorage = (snapshot: Record<string, PersistedEntityTypeDraft>): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Out of quota or storage blocked — in-memory cache is still good for
    // the rest of the session.
  }
};

const hydrateOnce = (): void => {
  if (hasHydrated) return;
  hasHydrated = true;
  const stored = readStorage();
  for (const [id, value] of Object.entries(stored)) {
    if (value && typeof value === 'object') {
      cache.set(id, value);
    }
  }
};

/**
 * Returns the last-persisted draft slice for the given entity-type id, or
 * `undefined` if the row has never been saved. Callers should merge this on
 * top of `buildFakeEntityTypeDraft(...)` defaults to produce the initial
 * form state.
 */
export const getPersistedEntityTypeDraft = (
  entityTypeId: string
): PersistedEntityTypeDraft | undefined => {
  hydrateOnce();
  return cache.get(entityTypeId);
};

/**
 * Persist the editable slice of an `EntityTypeDraft`. Called on
 * "Save modifications" in the wizard so re-opening the same row shows the
 * user's last-saved values rather than the original mock defaults.
 */
export const persistEntityTypeDraft = (entityTypeId: string, draft: EntityTypeDraft): void => {
  hydrateOnce();
  const slice: PersistedEntityTypeDraft = {
    general: draft.general,
    health: draft.health,
    ownership: draft.ownership,
    flyoutTabs: draft.flyoutTabs,
    customLinks: draft.customLinks,
    subsets: draft.subsets,
  };
  cache.set(entityTypeId, slice);
  const snapshot: Record<string, PersistedEntityTypeDraft> = {};
  for (const [id, value] of cache.entries()) {
    snapshot[id] = value;
  }
  writeStorage(snapshot);
};

/**
 * Apply a persisted slice on top of a freshly built draft. Fields the user
 * never touched keep their default values, so the merge is a partial
 * overlay rather than a wholesale replacement.
 */
export const mergePersistedDraft = (
  base: EntityTypeDraft,
  persisted: PersistedEntityTypeDraft | undefined
): EntityTypeDraft => {
  if (!persisted) return base;
  return {
    ...base,
    general: persisted.general ?? base.general,
    health: persisted.health ?? base.health,
    ownership: persisted.ownership ?? base.ownership,
    flyoutTabs: persisted.flyoutTabs ?? base.flyoutTabs,
    customLinks: persisted.customLinks ?? base.customLinks,
    subsets: persisted.subsets ?? base.subsets,
  };
};
