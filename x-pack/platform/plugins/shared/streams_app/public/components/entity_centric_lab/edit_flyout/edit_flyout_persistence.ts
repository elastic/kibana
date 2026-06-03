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
 *
 * The persisted `general` block goes through {@link migrateGeneralFields}
 * to upgrade legacy shapes (e.g. the pre-multi-identifier
 * `identifierField: string` field) into the current
 * `identifierFields: string[] + displayField: string` model so drafts
 * saved before the schema change still hydrate cleanly without
 * dropping the user's previously-saved identifier choice.
 */
export const mergePersistedDraft = (
  base: EntityTypeDraft,
  persisted: PersistedEntityTypeDraft | undefined
): EntityTypeDraft => {
  if (!persisted) return base;
  return {
    ...base,
    general: persisted.general ? migrateGeneralFields(persisted.general) : base.general,
    health: persisted.health ?? base.health,
    ownership: persisted.ownership ?? base.ownership,
    flyoutTabs: persisted.flyoutTabs ?? base.flyoutTabs,
    customLinks: persisted.customLinks ?? base.customLinks,
    subsets: persisted.subsets ?? base.subsets,
  };
};

/**
 * Legacy shape — the wizard used to expose a single
 * `identifierField: string` instead of the current
 * `identifierFields: string[] + displayField: string` pair. Persisted
 * payloads written under that schema need to be upgraded on read so the
 * General step doesn't try to render `undefined.map(...)` on the
 * identifier ComboBox. We keep the legacy field as optional rather
 * than removing it from the type because any old `localStorage` entry
 * is plain JSON and TypeScript can't enforce its absence at the
 * boundary.
 */
interface LegacyGeneralFields {
  readonly name: string;
  readonly dataStream: string;
  readonly identifierField?: string;
  readonly identifierFields?: readonly string[];
  readonly displayField?: string;
  readonly category: string;
  readonly description: string;
}

const migrateGeneralFields = (raw: GeneralFields): GeneralFields => {
  // `raw` is typed as the new shape but at runtime can still be the
  // legacy one — `JSON.parse` doesn't validate. We re-type once,
  // locally, then map it back into the current model.
  const legacy = raw as unknown as LegacyGeneralFields;
  if (Array.isArray(legacy.identifierFields)) {
    // Already in the new shape; just make sure `displayField` exists so
    // downstream `EuiSelect` doesn't get `undefined` as `value`.
    return {
      name: legacy.name,
      dataStream: legacy.dataStream,
      identifierFields: legacy.identifierFields,
      displayField: legacy.displayField ?? legacy.identifierFields[0] ?? '',
      category: legacy.category,
      description: legacy.description,
    };
  }
  // Legacy single-field draft: promote the lone identifier to both the
  // multi-field tuple AND the display field, since that was the
  // implicit "display = identifier" contract before the split.
  const legacyId = legacy.identifierField?.trim() ?? '';
  return {
    name: legacy.name,
    dataStream: legacy.dataStream,
    identifierFields: legacyId.length > 0 ? [legacyId] : [],
    displayField: legacyId,
    category: legacy.category,
    description: legacy.description,
  };
};
