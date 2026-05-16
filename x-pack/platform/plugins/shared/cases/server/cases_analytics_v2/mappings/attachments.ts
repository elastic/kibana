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
 * SO schema. The doc-builder feeds both the legacy `cases-comments` SO
 * and the new `cases-attachments` SO through
 * `getAttachmentTypeTransformers(...).toUnifiedSchema(...)` so the
 * analytics index is consistent regardless of where in the in-flight
 * SO migration (security-team#15066) a tenant sits:
 *   - pre-migration tenants: only `cases-comments` exists; legacy →
 *     unified shape happens at write time.
 *   - mid-migration tenants: both SO types coexist; both feed in.
 *   - post-migration tenants: only `cases-attachments` exists; identity
 *     transform.
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
 *   - `kibana.space_ids` — every space this attachment belongs to.
 *     Future DLS key, mirrors the cases + activity surfaces.
 *   - `cases.id` — denormalized from the SO `references[case]` so
 *     ES|QL `LOOKUP JOIN .cases ON cases.id` works without an
 *     intermediate aggregation.
 *   - `created_by.* / updated_by.* / pushed_by.*` — flattened user
 *     refs. Match the cases surface's `created_by` shape.
 *   - `attachment.*` — the unified attachment shape: `type`,
 *     reference-style `attachment_id`, polymorphic `data` and
 *     `metadata` stringified for schema-drift insurance, plus a
 *     curated set of typed extracts for the common analytical pivots
 *     (`comment`, `alert.rule.*`, `actions.type`).
 *
 * Intentional divergences from the unified SO shape:
 *   - `data`: the unified SO carries it as `Record<string, JsonValue>`.
 *     The analytics index strict-maps a few curated extracts and
 *     stringifies the full blob as `attachment.data_json`
 *     (`keyword`, `ignore_above`). Same rationale as the activity
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
 * endpoint-action distribution). They're populated only when the
 * attachment `type` carries the matching payload field; other types
 * leave them unset.
 */
export const ATTACHMENTS_INDEX_MAPPING: MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    '@timestamp': { type: 'date' },

    kibana: {
      properties: {
        space_ids: { type: 'keyword' },
      },
    },

    cases: {
      properties: {
        // Denormalized from the SO's `references[case]`. Single value
        // per doc — an attachment belongs to exactly one case.
        id: { type: 'keyword' },
      },
    },

    // Mirrors the cases + activity surfaces' `owner`. Useful for
    // per-solution slicing.
    owner: { type: 'keyword' },

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
        // `securityAlert`, `securityEvent`, etc.): the referenced
        // entity ids. Unified payloads carry `attachmentId` as
        // `string | string[]`; the doc-builder normalizes to
        // `string[]` so queries don't have to handle both shapes.
        attachment_id: { type: 'keyword' },

        // Stringified unified `data` blob. The unified shape allows
        // arbitrary plugin-defined value content (Lens viz state, user
        // comment, persistable state, etc.). `ignore_above: 32766`
        // matches the `keyword` upper bound; payloads exceeding that
        // get truncated rather than rejected.
        data_json: { type: 'keyword', ignore_above: 32766 },

        // Stringified unified `metadata` blob. Same rationale as
        // `data_json`; arbitrary plugin-defined per attachment type.
        metadata_json: { type: 'keyword', ignore_above: 32766 },

        // ----- Curated extracts -----

        // For `user` and `actions` subtypes: the user-visible comment
        // text. `text + keyword` so analysts can full-text search
        // (Discover) AND group (Lens). Sourced from `data.content`
        // (unified) / `comment` (legacy) at doc-build time.
        comment: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 8191 } },
        },

        // Alert-rule extracts. For alert-style attachments, the rule
        // attribution lives under `metadata.rule` in the unified shape
        // and is the highest-signal metadata field for downstream
        // dashboards (alerts-by-rule, top-rules-per-tenant).
        alert: {
          properties: {
            rule: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'keyword' },
              },
            },
            // `metadata.index` for alert/event subtypes; multi-value
            // when the alert spans indices.
            indices: { type: 'keyword' },
          },
        },

        // Endpoint-action extracts. Used by the security `actions`
        // subtype (isolate / unisolate). Powers per-action-type
        // distribution dashboards.
        actions: {
          properties: {
            type: { type: 'keyword' },
          },
        },

        // External reference attribution. The plugin-registered type
        // id (`.files`, `endpoint`, etc.) is high-signal for tracking
        // which attachment plugins are in use cluster-wide.
        external_reference: {
          properties: {
            type_id: { type: 'keyword' },
            storage_type: { type: 'keyword' },
          },
        },

        // Persistable-state subtype attribution. Same rationale as
        // `external_reference.type_id` — tracks which persistable
        // attachment registrations are in use.
        persistable_state: {
          properties: {
            type_id: { type: 'keyword' },
          },
        },
      },
    },
  },
};
