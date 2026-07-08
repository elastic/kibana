/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { isAlertAttachmentType, isEventAttachmentType } from '../../../common/utils/attachments';
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
  // Top-level scoping fields for implicit-privileges DLS, matching the cases
  // and activity surfaces. `space_id` is singular — an attachment lives in
  // exactly one space. See `mappings/attachments.ts`.
  space_id: string;
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
    /** Unified type name (e.g. `comment`, `security.alert`, `security.endpoint`, `lens`). */
    type: string;
    /** Reference attachments only — normalized to `string[]`. */
    attachment_id?: string[];
    /** Stringified unified `data` blob (schema-drift insurance). */
    data_json?: string;
    /** Stringified unified `metadata` blob (schema-drift insurance). */
    metadata_json?: string;
    // ----- Curated extracts -----
    // Only the two extracts that answer day-one product questions are
    // curated into typed fields: comment text (what analysts wrote) and
    // alert/event context (rule + source indices). Every other subtype's
    // shape is still fully queryable via `data_json` / `metadata_json`,
    // so no analytical signal is lost by not curating it — see the
    // doc-builder header for the rationale behind dropping the legacy
    // `actions` / `external_reference` / `persistable_state` extracts.
    /** Comment text for value subtypes (`comment`, and legacy `user`). */
    comment?: string;
    /** Alert-subtype context: originating rule + the alerts' source indices. */
    alert?: {
      rule?: {
        id?: string | null;
        name?: string | null;
      };
      indices?: string[];
    };
    /** Event-subtype context: the events' source indices. */
    event?: {
      indices?: string[];
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
 * unified `cases-attachments` type (both coexist — legacy comments are
 * not back-migrated). Both source shapes are routed through
 * `getAttachmentTypeTransformers(...).toUnifiedSchema(...)` so the rest
 * of this builder operates on a single normalized shape. That keeps the
 * analytics index byte-for-byte equivalent regardless of which source
 * type an attachment was written as.
 *
 * For unmigrated externalReference / persistableState subtypes that
 * have no entry in `EXTERNAL_REFERENCE_TYPE_MAP`, the transformer
 * falls back to `passThroughTransformer` which casts the legacy
 * attributes through unchanged. The doc-builder still works against
 * those because:
 *   - `attachment.type` keeps the legacy `'externalReference'` /
 *     `'persistableState'` value, which still groups correctly in
 *     Lens.
 *   - Their full persisted shape is still queryable via the
 *     `data_json` / `metadata_json` blobs; only the two high-value
 *     extracts (comment + alert/event context) get their own typed
 *     fields. The legacy `actions` / `external_reference` /
 *     `persistable_state` typed extracts were dropped because every
 *     legacy shape now has a forward transformer, so those signals are
 *     either projected onto the unified fields already covered here or
 *     remain fully available in the JSON blobs — a dedicated column for
 *     each added mapping surface without answering a distinct product
 *     question.
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
  // Normalize legacy → unified. The source may be a legacy
  // `cases-comments` SO or a unified `cases-attachments` SO; the
  // transformer handles both.
  const unified = toUnifiedAttributes(sourceAttrs);
  const caseId = pickCaseId(so);

  return {
    '@timestamp': unified.created_at,
    // Top-level singular scoping field for implicit-privileges DLS. Attachment
    // SOs are space-isolated, so take the first namespace (default `default`).
    space_id: so.namespaces?.[0] ?? 'default',
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
function toUser(
  user: UnifiedAttachmentAttributes['created_by'] | null | undefined
): AttachmentUserDoc {
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
  // `attachmentId`, or a legacy alert/event still uses `alertId` /
  // `eventId`. Read both so the analytics surface works against either
  // source SO type.
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
 * the same builder works for both source SO types (and for the rare
 * defensive path where `toUnifiedAttributes` returns the raw legacy
 * attributes after a transform failure):
 *   - `comment`: unified value subtypes carry it under `data.content`;
 *     the legacy `user` subtype carries it as a top-level `comment`.
 *   - `alert.rule.{id,name}`: unified alert subtype lifts it into
 *     `metadata.rule`; legacy alert subtype carries it as a top-level
 *     `rule`.
 *   - `alert.indices` / `event.indices`: unified subtypes lift the
 *     source indices into `metadata.index`; legacy subtypes use the
 *     top-level `index`.
 *
 * The alert vs. event split is driven by the attachment type
 * (`isAlertAttachmentType` / `isEventAttachmentType`), which recognize
 * both the legacy enum values (`alert` / `event`) and the unified,
 * owner-scoped type names (`security.alert`, `security.event`, ...). An
 * attachment is at most one of the two, so the extracts are mutually
 * exclusive.
 *
 * Only these two extracts are curated; every other subtype's full shape
 * stays queryable via `data_json` / `metadata_json`. Add new entries
 * only when a distinct product question justifies a dedicated mapped
 * field; the schema-drift Layer-2 test in
 * `mappings/attachments_schema_drift.test.ts` enforces a per-subtype
 * contract so an extract change can't silently desync from the mapping.
 */
function extractCurated(
  unified: UnifiedAttachmentAttributes,
  source: AttachmentPersistedAttributes | UnifiedAttachmentAttributes
): Partial<AttachmentAnalyticsDoc['attachment']> {
  const out: Partial<AttachmentAnalyticsDoc['attachment']> = {};

  // ----- Comment text (value subtypes) -----
  const comment = extractComment(unified, source);
  if (comment != null) out.comment = comment;

  // ----- Alert / event source indices + rule -----
  // Both subtypes lift their source indices into the same field
  // (`metadata.index` unified / top-level `index` legacy); only alerts
  // additionally carry an originating `rule`. An attachment is at most
  // one of the two, so these extracts are mutually exclusive.
  const type = typeof unified.type === 'string' ? unified.type : '';
  const indices = extractSourceIndices(unified, source);

  if (isAlertAttachmentType(type)) {
    const alert = buildAlertExtract(unified, source, indices);
    if (alert != null) out.alert = alert;
  } else if (isEventAttachmentType(type)) {
    if (indices.length > 0) out.event = { indices };
  }

  return out;
}

/**
 * Comment text for value subtypes. Unified value subtypes carry it under
 * `data.content`; the legacy `user` subtype carries it as a top-level
 * `comment`. Returns `undefined` when neither is a string.
 */
function extractComment(
  unified: UnifiedAttachmentAttributes,
  source: AttachmentPersistedAttributes | UnifiedAttachmentAttributes
): string | undefined {
  const unifiedContent = (unified as unknown as { data?: { content?: unknown } }).data?.content;
  if (typeof unifiedContent === 'string') return unifiedContent;
  const legacyComment = (source as unknown as { comment?: unknown }).comment;
  if (typeof legacyComment === 'string') return legacyComment;
  return undefined;
}

/**
 * Alert/event source indices, deduped to `string[]`. Unified subtypes
 * lift the source indices into `metadata.index`; legacy subtypes use the
 * top-level `index`.
 */
function extractSourceIndices(
  unified: UnifiedAttachmentAttributes,
  source: AttachmentPersistedAttributes | UnifiedAttachmentAttributes
): string[] {
  const unifiedIndex = (unified as unknown as { metadata?: { index?: unknown } }).metadata?.index;
  const legacyIndex = (source as unknown as { index?: unknown }).index;
  return normalizeIds(unifiedIndex ?? legacyIndex);
}

/**
 * Alert-subtype extract: originating `rule` (id + name) plus the alerts'
 * source `indices`. Returns `undefined` when neither is present so the
 * caller omits the field entirely under `dynamic: 'strict'`.
 */
function buildAlertExtract(
  unified: UnifiedAttachmentAttributes,
  source: AttachmentPersistedAttributes | UnifiedAttachmentAttributes,
  indices: string[]
): NonNullable<AttachmentAnalyticsDoc['attachment']['alert']> | undefined {
  const alert: NonNullable<AttachmentAnalyticsDoc['attachment']['alert']> = {};
  const rule = extractRule(unified, source);
  if (rule != null) alert.rule = rule;
  if (indices.length > 0) alert.indices = indices;
  return Object.keys(alert).length > 0 ? alert : undefined;
}

/**
 * Originating rule for an alert subtype. Unified alert subtypes lift it
 * into `metadata.rule`; legacy alert subtypes carry a top-level `rule`.
 * Only `id` / `name` are projected (each `string | null`), and only when
 * present — returns `undefined` when neither resolves.
 */
function extractRule(
  unified: UnifiedAttachmentAttributes,
  source: AttachmentPersistedAttributes | UnifiedAttachmentAttributes
): { id?: string | null; name?: string | null } | undefined {
  const unifiedRule = (
    unified as unknown as { metadata?: { rule?: { id?: unknown; name?: unknown } | null } }
  ).metadata?.rule;
  const legacyRule = (source as unknown as { rule?: { id?: unknown; name?: unknown } | null }).rule;
  const rule = unifiedRule ?? legacyRule;
  if (rule == null || typeof rule !== 'object') return undefined;

  const ruleOut: { id?: string | null; name?: string | null } = {};
  if ('id' in rule && (typeof rule.id === 'string' || rule.id === null)) ruleOut.id = rule.id;
  if ('name' in rule && (typeof rule.name === 'string' || rule.name === null))
    ruleOut.name = rule.name;
  return Object.keys(ruleOut).length > 0 ? ruleOut : undefined;
}

/**
 * Coerces an `id` field that arrives as `string | string[] | null |
 * undefined` (the union shape used by reference attachments) to a
 * deduped `string[]`, preserving first-seen order. Anything that isn't
 * a string or an array of strings is dropped. Dedupe matters for the
 * multi-id alert variant, where the same alert id can legitimately
 * appear more than once in the source array.
 */
function normalizeIds(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    const seen = new Set<string>();
    for (const v of value) {
      if (typeof v === 'string') seen.add(v);
    }
    return Array.from(seen);
  }
  return [];
}

/**
 * Serializes an arbitrary value. Returns the empty string for
 * null/undefined inputs and for inputs that throw from `JSON.stringify`
 * (cyclic refs, non-serializable values — not expected from persisted
 * SOs but defensive for forward-compat).
 *
 * `data_json` / `metadata_json` are mapped as `wildcard`, which has no
 * length cap and is not truncated on write, so the full serialized blob
 * is indexed as-is regardless of size.
 */
function stringifyJson(value: unknown): string {
  if (value == null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}
