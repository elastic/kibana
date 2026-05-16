/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import {
  getAttachmentTypeFromAttributes,
  getAttachmentTypeTransformers,
} from '../../common/attachments';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../../common/types/attachments_v2';

/**
 * Shape of a single document indexed into `.cases-attachments`.
 * Mirrors `ATTACHMENTS_INDEX_MAPPING` exactly — every field has a
 * matching mapping, and the mapping is `dynamic: 'strict'` so adding
 * a field here without updating the mapping fails the write.
 *
 * Hand-crafted (rather than `extends UnifiedAttachmentAttributes`)
 * for the same reason as `CaseAnalyticsDoc` and `ActivityAnalyticsDoc`:
 * the analytics doc is a curated projection, not a cosmetic transform
 * of the SO. Coupling them via `extends` would force every additive
 * change to the unified attachment shape into the analytics surface.
 */
export interface AttachmentAnalyticsDoc {
  '@timestamp': string;
  kibana: {
    space_ids: string[];
  };
  cases: {
    id: string;
  };
  owner: string;
  created_at: string;
  created_by: AttachmentUserDoc;
  updated_at?: string | null;
  updated_by?: AttachmentUserDoc | null;
  pushed_at?: string | null;
  pushed_by?: AttachmentUserDoc | null;
  attachment: {
    /** Unified type name (e.g. `comment`, `securityAlert`, `security.endpoint`, `lens`). */
    type: string;
    /** Reference attachments only — normalized to `string[]`. */
    attachment_id?: string[];
    /** Stringified unified `data` blob (schema-drift insurance). */
    data_json?: string;
    /** Stringified unified `metadata` blob (schema-drift insurance). */
    metadata_json?: string;
    // ----- Curated extracts -----
    /** For `user` / `actions` / `comment` subtypes. */
    comment?: string;
    alert?: {
      rule?: {
        id?: string | null;
        name?: string | null;
      };
      indices?: string[];
    };
    actions?: {
      type?: string;
    };
    external_reference?: {
      type_id?: string;
      storage_type?: string;
    };
    persistable_state?: {
      type_id?: string;
    };
  };
}

interface AttachmentUserDoc {
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  profile_uid?: string;
}

/**
 * Pure transformation: attachment saved-object → analytics doc.
 *
 * Accepts SOs from EITHER the legacy `cases-comments` type OR the
 * unified `cases-attachments` type. Both source shapes are routed
 * through `getAttachmentTypeTransformers(...).toUnifiedSchema(...)` so
 * the rest of this builder operates on a single normalized shape.
 * That keeps the analytics index byte-for-byte equivalent regardless
 * of where in the in-flight SO migration (security-team#15066) a
 * tenant sits.
 *
 * For unmigrated externalReference / persistableState subtypes that
 * have no entry in `EXTERNAL_REFERENCE_TYPE_MAP`, the transformer
 * falls back to `passThroughTransformer` which casts the legacy
 * attributes through unchanged. The doc-builder still works against
 * those because:
 *   - `attachment.type` keeps the legacy `'externalReference'` /
 *     `'persistableState'` value, which still groups correctly in
 *     Lens.
 *   - The legacy `externalReferenceAttachmentTypeId` /
 *     `persistableStateAttachmentTypeId` are surfaced as curated
 *     extracts (`attachment.external_reference.type_id` /
 *     `attachment.persistable_state.type_id`) by reading from either
 *     the unified or the legacy field name — see `extractCurated`
 *     below.
 *   - `data` / `metadata` / `attachmentId` from the unified path are
 *     null for these legacy-only subtypes, so the corresponding
 *     analytics fields are absent rather than empty strings.
 *
 * Side-effect-free, deterministic, safe to call from any context. The
 * round-trip guard in `mappings/attachments_schema_drift.test.ts`
 * asserts every emitted dotted path resolves in the mapping AND
 * exercises both source SO shapes per subtype.
 */
export function buildAttachmentDoc(
  so: SavedObject<AttachmentPersistedAttributes | UnifiedAttachmentAttributes>
): AttachmentAnalyticsDoc {
  const sourceAttrs = so.attributes;
  // Normalize legacy → unified. For pre-migration tenants this is a
  // legacy-comments SO; for post-migration it's a unified-attachments
  // SO; the transformer handles both.
  const unified = toUnifiedAttributes(sourceAttrs);
  const caseId = pickCaseId(so);

  return {
    '@timestamp': unified.created_at,
    kibana: {
      space_ids: so.namespaces ?? ['default'],
    },
    cases: { id: caseId },
    owner: unified.owner,
    created_at: unified.created_at,
    created_by: toUser(unified.created_by),
    updated_at: unified.updated_at,
    updated_by: toUserOrNull(unified.updated_by),
    pushed_at: unified.pushed_at,
    pushed_by: toUserOrNull(unified.pushed_by),
    attachment: {
      type: typeof unified.type === 'string' ? unified.type : 'unknown',
      ...projectReferenceAndValueFields(unified, sourceAttrs),
      ...extractCurated(unified, sourceAttrs),
    },
  };
}

/**
 * Run the source attributes through the type-aware transformer's
 * `toUnifiedSchema`. Wrapped in a try/catch because a malformed SO
 * (very unlikely from a real persisted SO, but possible from a test
 * fixture or a forward-compat shape) shouldn't crash the writer —
 * better to emit a minimally-shaped doc and let reconciliation re-emit
 * a corrected version when the source shape stabilizes.
 */
function toUnifiedAttributes(
  attributes: AttachmentPersistedAttributes | UnifiedAttachmentAttributes
): UnifiedAttachmentAttributes {
  try {
    const typeKey = getAttachmentTypeFromAttributes(attributes);
    const owner = (attributes as { owner?: string }).owner ?? '';
    const transformer = getAttachmentTypeTransformers(typeKey, owner);
    return transformer.toUnifiedSchema(attributes);
  } catch {
    // Defensive: a malformed SO yields the original attributes cast
    // forward. The strict mapping will reject anything that doesn't
    // line up, surfacing in WARN logs.
    return attributes as UnifiedAttachmentAttributes;
  }
}

/**
 * Locates the parent-case id in the SO's `references` array. Both the
 * legacy `cases-comments` SO and the unified `cases-attachments` SO
 * carry the parent case as a single reference of type `cases`. Returns
 * the empty string when absent so the strict mapping still accepts the
 * doc.
 */
function pickCaseId(
  so: SavedObject<AttachmentPersistedAttributes | UnifiedAttachmentAttributes>
): string {
  for (const ref of so.references ?? []) {
    if (ref.type === CASE_SAVED_OBJECT) return ref.id;
  }
  return '';
}

/** Null-safe projection of the unified `created_by` user shape. */
function toUser(user: UnifiedAttachmentAttributes['created_by'] | null | undefined): AttachmentUserDoc {
  if (user == null) return {};
  return {
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    profile_uid: user.profile_uid,
  };
}

/** `created_by` is required on the unified shape; `updated_by` / `pushed_by` are nullable. */
function toUserOrNull(
  user: UnifiedAttachmentAttributes['updated_by'] | null | undefined
): AttachmentUserDoc | null {
  if (user == null) return null;
  return toUser(user);
}

/**
 * Stringifies `data` and `metadata` for schema-drift insurance, plus
 * normalizes `attachmentId` to `string[]` for query consistency. All
 * three fields are optional on the unified shape — present only on
 * the relevant subtype — so each is conditionally added.
 *
 * `attachment_id` is always emitted as `string[]` (or omitted) so
 * downstream queries don't have to handle the union shape from the
 * source SO. Reference subtypes that carry a single id arrive as
 * `string`; the bulk-multi-id alert variant arrives as `string[]`.
 */
function projectReferenceAndValueFields(
  unified: UnifiedAttachmentAttributes,
  source: AttachmentPersistedAttributes | UnifiedAttachmentAttributes
): Pick<AttachmentAnalyticsDoc['attachment'], 'attachment_id' | 'data_json' | 'metadata_json'> {
  const out: Pick<
    AttachmentAnalyticsDoc['attachment'],
    'attachment_id' | 'data_json' | 'metadata_json'
  > = {};

  // Reference attachments: either the unified shape carries
  // `attachmentId`, or an unmigrated legacy alert/event still uses
  // `alertId` / `eventId`. Read both so the analytics surface works
  // pre- and post-migration.
  const unifiedRefIds = (unified as unknown as { attachmentId?: unknown }).attachmentId;
  const legacyAlertIds = (source as unknown as { alertId?: unknown }).alertId;
  const legacyEventIds = (source as unknown as { eventId?: unknown }).eventId;
  const ids = normalizeIds(unifiedRefIds ?? legacyAlertIds ?? legacyEventIds);
  if (ids.length > 0) out.attachment_id = ids;

  const data = (unified as unknown as { data?: unknown }).data;
  if (data != null) {
    const json = stringifyJson(data);
    if (json !== '') out.data_json = json;
  }

  const metadata = (unified as unknown as { metadata?: unknown }).metadata;
  if (metadata != null) {
    const json = stringifyJson(metadata);
    if (json !== '') out.metadata_json = json;
  }

  return out;
}

/**
 * Pulls the curated typed extracts that power day-one Lens / Discover
 * analyses. Each clause is conditional on the source actually carrying
 * the field — under `dynamic: 'strict'`, omitting absent fields keeps
 * the index sparse (a no-op under strict), while emitting `null` would
 * eat a field slot.
 *
 * Reads from BOTH unified and legacy field names where applicable so
 * the same builder works for both source SO types:
 *   - `comment`: unified value subtypes carry it under `data.content`;
 *     legacy `user` / `actions` subtypes carry it as a top-level
 *     `comment`.
 *   - `alert.rule.{id,name}`: unified alert subtype lifts it into
 *     `metadata.rule`; legacy alert subtype carries it as a top-level
 *     `rule`.
 *   - `alert.indices`: unified alert lifts to `metadata.index`; legacy
 *     uses top-level `index`.
 *   - `external_reference.type_id` / `persistable_state.type_id`:
 *     unmigrated legacy externalReference / persistableState subtypes
 *     don't have a unified-shape counterpart, so we read directly
 *     from the source attributes.
 *
 * Add new entries as analytical needs surface; the schema-drift
 * Layer-2 test in `mappings/attachments_schema_drift.test.ts` enforces
 * a per-subtype contract so an extract change can't silently desync
 * from the mapping.
 */
function extractCurated(
  unified: UnifiedAttachmentAttributes,
  source: AttachmentPersistedAttributes | UnifiedAttachmentAttributes
): Partial<AttachmentAnalyticsDoc['attachment']> {
  const out: Partial<AttachmentAnalyticsDoc['attachment']> = {};

  // ----- Comment text (user / actions subtypes) -----
  const unifiedData = (unified as unknown as { data?: { content?: unknown } }).data;
  const legacyComment = (source as unknown as { comment?: unknown }).comment;
  const commentValue =
    typeof unifiedData?.content === 'string'
      ? unifiedData.content
      : typeof legacyComment === 'string'
      ? legacyComment
      : undefined;
  if (commentValue != null) out.comment = commentValue;

  // ----- Alert metadata (alert / event subtypes) -----
  const unifiedMetadata = (unified as unknown as {
    metadata?: { rule?: { id?: unknown; name?: unknown } | null; index?: unknown };
  }).metadata;
  const legacyRule = (source as unknown as { rule?: { id?: unknown; name?: unknown } | null })
    .rule;
  const legacyIndex = (source as unknown as { index?: unknown }).index;
  const rule = unifiedMetadata?.rule ?? legacyRule;
  const indexField = unifiedMetadata?.index ?? legacyIndex;
  const alert: NonNullable<AttachmentAnalyticsDoc['attachment']['alert']> = {};
  if (rule != null && typeof rule === 'object') {
    const ruleOut: { id?: string | null; name?: string | null } = {};
    if ('id' in rule && (typeof rule.id === 'string' || rule.id === null)) ruleOut.id = rule.id;
    if ('name' in rule && (typeof rule.name === 'string' || rule.name === null))
      ruleOut.name = rule.name;
    if (Object.keys(ruleOut).length > 0) alert.rule = ruleOut;
  }
  const indices = normalizeIds(indexField);
  if (indices.length > 0) alert.indices = indices;
  if (Object.keys(alert).length > 0) out.alert = alert;

  // ----- Endpoint / actions subtype -----
  // Legacy carries `actions.type` at the top level; unified value
  // attachments carry it under `data.actions.type`.
  const unifiedActions = (unified as unknown as { data?: { actions?: { type?: unknown } } }).data
    ?.actions;
  const legacyActions = (source as unknown as { actions?: { type?: unknown } }).actions;
  const actionsType =
    typeof unifiedActions?.type === 'string'
      ? unifiedActions.type
      : typeof legacyActions?.type === 'string'
      ? legacyActions.type
      : undefined;
  if (actionsType != null) out.actions = { type: actionsType };

  // ----- External reference (unmigrated legacy subtype) -----
  const externalRefTypeId = (source as unknown as { externalReferenceAttachmentTypeId?: unknown })
    .externalReferenceAttachmentTypeId;
  const externalRefStorage = (source as unknown as {
    externalReferenceStorage?: { type?: unknown };
  }).externalReferenceStorage;
  const externalRef: NonNullable<AttachmentAnalyticsDoc['attachment']['external_reference']> = {};
  if (typeof externalRefTypeId === 'string') externalRef.type_id = externalRefTypeId;
  if (typeof externalRefStorage?.type === 'string')
    externalRef.storage_type = externalRefStorage.type;
  if (Object.keys(externalRef).length > 0) out.external_reference = externalRef;

  // ----- Persistable state (unmigrated legacy subtype) -----
  const persistableTypeId = (source as unknown as {
    persistableStateAttachmentTypeId?: unknown;
  }).persistableStateAttachmentTypeId;
  if (typeof persistableTypeId === 'string') {
    out.persistable_state = { type_id: persistableTypeId };
  }

  return out;
}

/**
 * Coerces an `id` field that arrives as `string | string[] | null |
 * undefined` (the union shape used by reference attachments) to a
 * dedupe-respecting `string[]`. Anything that isn't a string or an
 * array of strings is dropped.
 */
function normalizeIds(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const v of value) {
      if (typeof v === 'string') out.push(v);
    }
    return out;
  }
  return [];
}

/**
 * Serializes an arbitrary value. Returns the empty string for
 * null/undefined inputs and for inputs that throw from `JSON.stringify`
 * (cyclic refs, non-serializable values — not expected from persisted
 * SOs but defensive for forward-compat).
 *
 * The result is bounded by the mapping's `ignore_above: 32766`; ES
 * truncates instead of rejecting on overflow, so very large
 * persistable-state blobs degrade gracefully.
 */
function stringifyJson(value: unknown): string {
  if (value == null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}
