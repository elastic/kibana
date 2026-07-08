/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

/**
 * Mapping for the `.cases-attachments` analytics index. One document
 * per attachment, keyed on the source SO id.
 *
 * The canonical document shape is the **unified** `cases-attachments`
 * SO schema. Both the legacy `cases-comments` SO and the newer
 * `cases-attachments` SO exist side by side (legacy comments are not
 * back-migrated), so the doc-builder feeds both through
 * `getAttachmentTypeTransformers(...).toUnifiedSchema(...)` — legacy
 * comments are projected to the unified shape, unified attachments pass
 * through the identity transform — keeping this index consistent
 * regardless of which source type an attachment was written as.
 *
 * Doc `_id` is the source SO id verbatim. SO ids are unique across
 * `cases-comments` and `cases-attachments` (the `AttachmentService`'s
 * own `bulkDelete` already issues parallel deletes against both types
 * with the same id, confirming the constraint), so the analytics doc
 * id never collides.
 *
 * `dynamic: 'strict'` makes a doc-builder field not declared here fail
 * the write with `mapper_parsing_exception`, surfacing in logs instead
 * of silently dropping. The three-layer drift guard in
 * `mappings/attachments_schema_drift.test.ts` catches accidental drift
 * across both source SO shapes (see the README for the layered
 * contract).
 *
 * Field group conventions:
 *   - `@timestamp` — required by Discover / Lens; set to the
 *     attachment's `created_at`.
 *   - `space_id` / `owner` — top-level (document-root) scoping fields for
 *     implicit-privileges DLS, matching the cases + activity surfaces.
 *     `space_id` is singular — an attachment lives in exactly one space.
 *   - `cases.id` — denormalized from the SO `references[case]` so
 *     ES|QL `LOOKUP JOIN .cases ON cases.id` works without an
 *     intermediate aggregation.
 *   - `created_by.* / updated_by.* / pushed_by.*` — flattened user
 *     refs. Match the cases surface's `created_by` shape.
 *   - `attachment.*` — the unified attachment shape: `type`,
 *     reference-style `attachment_id`, polymorphic `data` and
 *     `metadata` stringified for schema-drift insurance, plus a
 *     curated set of typed extracts for the common analytical pivots
 *     (`comment`, `alert.rule.*` + `alert.indices`, `event.indices`).
 *
 * Intentional divergences from the unified SO shape:
 *   - `data`: the unified SO carries it as `Record<string, JsonValue>`.
 *     The analytics index strict-maps a few curated extracts and
 *     stringifies the full blob as `attachment.data_json`
 *     (`wildcard`, no length cap). Same rationale as the activity
 *     surface's `payload_json` — analysts can reach into the payload
 *     via ES|QL `MV_FROM_JSON` while typed extracts power Lens
 *     facets natively.
 *   - `metadata`: stringified the same way as `attachment.metadata_json`.
 *     The unified shape allows arbitrary plugin-defined metadata per
 *     attachment type (e.g. `metadata.rule` for alerts,
 *     `metadata.index` for events, anything for plugin-registered
 *     external references). A typed map would either trip the 1000-
 *     field cluster limit (every plugin's metadata key burns one slot)
 *     or require `dynamic: true` + dynamic_template — neither is
 *     acceptable per the strict-mapping discipline. The curated
 *     extract `attachment.alert.rule.{id,name}` covers the highest-
 *     signal metadata access path in Lens.
 *   - `attachmentId`: arrives as `string | string[]` from the unified
 *     payload (single-id reference attachments use `string`; multi-id
 *     bulk references use `string[]`). The doc-builder normalizes to
 *     `string[]` and writes to `attachment.attachment_id` so query
 *     consumers don't have to handle both shapes.
 *
 * Curated extracts are bounded keyword / text fields chosen for value
 * to common analyses (comment-volume tracking, alert-rule attribution,
 * alert/event source-index distribution). They're populated only when
 * the attachment `type` is the matching subtype; other types leave them
 * unset and remain fully queryable via `data_json` / `metadata_json`.
 */
export const ATTACHMENTS_INDEX_MAPPING: MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    '@timestamp': { type: 'date' },

    // Top-level scoping fields for implicit-privileges DLS, matching the
    // cases + activity surfaces. `space_id` is singular — an attachment
    // lives in exactly one space; `owner` carries the solution dimension.
    space_id: { type: 'keyword' },
    owner: { type: 'keyword' },

    cases: {
      properties: {
        // Denormalized from the SO's `references[case]`. Single value
        // per doc — an attachment belongs to exactly one case.
        id: { type: 'keyword' },
      },
    },

    created_at: { type: 'date' },
    created_by: {
      properties: {
        username: { type: 'keyword' },
        full_name: { type: 'keyword' },
        email: { type: 'keyword' },
        profile_uid: { type: 'keyword' },
      },
    },

    // Nullable on freshly-created attachments. Mutable surface — the
    // reconciliation runner uses the `updated_at IS NULL` OR clause so
    // never-patched attachments are still re-emitted every tick.
    updated_at: { type: 'date' },
    updated_by: {
      properties: {
        username: { type: 'keyword' },
        full_name: { type: 'keyword' },
        email: { type: 'keyword' },
        profile_uid: { type: 'keyword' },
      },
    },

    pushed_at: { type: 'date' },
    pushed_by: {
      properties: {
        username: { type: 'keyword' },
        full_name: { type: 'keyword' },
        email: { type: 'keyword' },
        profile_uid: { type: 'keyword' },
      },
    },

    attachment: {
      properties: {
        // The unified attachment `type`. Open vocabulary — plugins
        // register their own subtypes (`security.endpoint`,
        // `lens`, etc.) alongside the built-ins (`user`, `alert`,
        // `event`, `actions`, `externalReference`, `persistableState`).
        // Keyword for grouping / faceting in Lens.
        type: { type: 'keyword' },

        // For reference-style attachments (`alert`, `event`,
        // `security.alert`, `security.event`, etc.): the referenced
        // entity ids. Unified payloads carry `attachmentId` as
        // `string | string[]`; the doc-builder normalizes to
        // `string[]` so queries don't have to handle both shapes.
        attachment_id: { type: 'keyword' },

        // Stringified unified `data` blob. The unified shape allows
        // arbitrary plugin-defined value content (Lens viz state, user
        // comment, persistable state, etc.). `wildcard` (not `keyword`)
        // so there is no length cap: a `keyword` silently drops values
        // over `ignore_above` from the index and doc values, which would
        // make large attachment payloads (Lens/dashboard viz state, bulk
        // content) return `null` in ES|QL. `wildcard` stores the full
        // value with no per-value limit and is purpose-built for large,
        // opaque strings queried with grep-style predicates — exactly
        // this field's access pattern. We never aggregate or sort on it
        // (the curated extracts below serve faceting). Matches the
        // activity surface's `action.payload_json`.
        data_json: { type: 'wildcard' },

        // Stringified unified `metadata` blob. Same rationale as
        // `data_json`; arbitrary plugin-defined per attachment type.
        metadata_json: { type: 'wildcard' },

        // ----- Curated extracts -----

        // For value subtypes (`comment`, and the legacy `user`
        // subtype): the user-visible comment text. `text + keyword` so
        // analysts can full-text search (Discover) AND group (Lens).
        // Sourced from `data.content` (unified) / `comment` (legacy) at
        // doc-build time.
        comment: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 8191 } },
        },

        // Alert-subtype extracts. The originating rule (`metadata.rule`
        // unified / top-level `rule` legacy) is the highest-signal
        // metadata field for downstream dashboards (alerts-by-rule,
        // top-rules-per-tenant); `indices` captures the alerts' source
        // indices (`metadata.index` unified / top-level `index` legacy),
        // multi-value when the attachment spans indices.
        alert: {
          properties: {
            rule: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'keyword' },
              },
            },
            indices: { type: 'keyword' },
          },
        },

        // Event-subtype extracts. Events are reference attachments with
        // no originating rule, so only the source indices are curated
        // (`metadata.index` unified / top-level `index` legacy),
        // multi-value when the attachment spans indices.
        event: {
          properties: {
            indices: { type: 'keyword' },
          },
        },
      },
    },
  },
};
