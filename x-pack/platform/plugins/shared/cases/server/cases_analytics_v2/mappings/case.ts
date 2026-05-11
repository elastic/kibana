/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { CASE_DYNAMIC_TEMPLATES } from './dynamic_templates';

/**
 * Mapping for the `.cases` analytics index. One document per case, keyed on
 * the case saved-object id.
 *
 * **Source of truth**: this mapping mirrors the cases SO mapping at
 * `server/saved_object_types/cases/cases.ts`. Field types and shapes should
 * match unless there's an explicit analytics-only divergence (noted inline).
 *
 * `dynamic: 'strict'` — any field the doc-builder emits that isn't declared
 * here will fail the write with `mapper_parsing_exception`. We prefer strict
 * over `dynamic: false` because silent drops are a foot-gun: the writer's
 * fire-and-forget contract means a strict failure surfaces in error logs, but
 * a dropped field looks identical to "the feature isn't wired up." A
 * round-trip schema-drift guard test (added with the doc-builder in a later
 * commit) protects against accidental drift.
 *
 * Field group conventions:
 *   - `@timestamp`           — required by Discover / Lens for time-aware UX.
 *                              Set to `case.updated_at` (or `created_at` if
 *                              the case has never been updated) at write time.
 *   - `kibana.space_ids`     — every space this case belongs to. Future DLS
 *                              key.
 *   - `cases.*`              — case-specific fields, namespaced so runtime
 *                              fields published at `cases.<snake>` can lift
 *                              extended-field keywords to typed values without
 *                              colliding with top-level fields.
 *
 * **Deliberate divergences from the SO mapping:**
 *   - `status` and `severity`: SO stores numeric enums (`short`); the
 *     analytics doc converts them to human-readable keywords (`"low"`,
 *     `"open"`, etc.) so Lens / Discover display sensible labels without an
 *     extra transform. The conversion lives in the doc-builder.
 *   - `extended_fields`: SO uses `flattened`; v2 uses an object with a
 *     `dynamic_template` mapping every child to keyword. The per-child
 *     keyword paths are needed by the runtime field lift
 *     (`cases.<snake>` → typed) — `flattened` collapses everything into one
 *     field and breaks individual access.
 *   - `observables`: SO uses a nested array of `{ typeKey, value,
 *     description }` triples; v2 denormalizes to one keyword array per
 *     `typeKey` (`cases.observables.url: ["http://..."]`). Preserves the
 *     type↔value relationship via the field path and lets analysts run
 *     simple term queries instead of nested aggregations. `description` is
 *     dropped — it's free text per-observable and isn't a useful analytics
 *     dimension. Doc-builder does the regrouping.
 *   - `time_to_acknowledge` / `time_to_investigate` / `time_to_resolve` /
 *     `in_progress_at`: present in the cases SO's persisted attributes but
 *     not listed in the SO mapping (the SO uses `dynamic: false`, so they're
 *     stored in `_source` only). v2's `dynamic: 'strict'` requires every
 *     field to be declared, so we explicitly map them as SLA metrics — they
 *     power dashboards directly.
 *
 * **`settings` stored opaque** (`enabled: false`). Per-case config (sync
 * alerts, extract observables) isn't an analytics dimension; analysts care
 * about case content, not its toggles. Still round-trips through `_source`.
 */
export const CASE_INDEX_MAPPING: MappingTypeMapping = {
  dynamic: 'strict',
  dynamic_templates: CASE_DYNAMIC_TEMPLATES,
  properties: {
    '@timestamp': { type: 'date' },

    kibana: {
      properties: {
        space_ids: { type: 'keyword' },
      },
    },

    cases: {
      properties: {
        id: { type: 'keyword' },
        owner: { type: 'keyword' },
        title: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 1024 } },
        },
        description: { type: 'text' },
        tags: { type: 'keyword' },
        category: { type: 'keyword' },
        // Human-readable strings, converted in the doc-builder from the SO's
        // numeric enums. See "Deliberate divergences" above.
        status: { type: 'keyword' },
        severity: { type: 'keyword' },
        // Object (not `nested`) — matches the SO. `nested` is only needed when
        // sub-fields must be queried independently per-element, which isn't
        // a case-level use case.
        assignees: {
          properties: {
            uid: { type: 'keyword' },
          },
        },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
        closed_at: { type: 'date' },
        in_progress_at: { type: 'date' },
        created_by: {
          properties: {
            username: { type: 'keyword' },
            full_name: { type: 'keyword' },
            email: { type: 'keyword' },
            profile_uid: { type: 'keyword' },
          },
        },
        updated_by: {
          properties: {
            username: { type: 'keyword' },
            full_name: { type: 'keyword' },
            email: { type: 'keyword' },
            profile_uid: { type: 'keyword' },
          },
        },
        closed_by: {
          properties: {
            username: { type: 'keyword' },
            full_name: { type: 'keyword' },
            email: { type: 'keyword' },
            profile_uid: { type: 'keyword' },
          },
        },
        // Counters are `integer` — bounded by the cases plugin's hard limits
        // (1000 alerts and 1000 events per case). `integer` is half the
        // storage of `long` at no practical cost.
        total_alerts: { type: 'integer' },
        total_comments: { type: 'integer' },
        total_events: { type: 'integer' },
        total_observables: { type: 'integer' },
        // `duration` is the case lifetime in milliseconds. `unsigned_long`
        // matches the SO; a case open for ~292 million years would still fit
        // in `long`, but we mirror the SO type to avoid an unnecessary
        // divergence.
        duration: { type: 'unsigned_long' },
        // SLA timing fields. Not in the SO mapping (the SO stores them in
        // `_source` only via `dynamic: false`); listed here because v2 is
        // `dynamic: 'strict'` and these power SLA dashboards.
        time_to_acknowledge: { type: 'long' },
        time_to_investigate: { type: 'long' },
        time_to_resolve: { type: 'long' },
        // `incremental_id`: monotonic per-tenant id. Matches the SO exactly,
        // including the multi-fields — `keyword` and `text` give exact-match
        // and full-text search on the same value (useful for users who type
        // a partial id into a search bar).
        incremental_id: {
          type: 'unsigned_long',
          fields: {
            keyword: { type: 'keyword' },
            text: { type: 'text' },
          },
        },
        template: {
          properties: {
            id: { type: 'keyword' },
            version: { type: 'integer' },
          },
        },
        // Connector and external_service are indexed per their SO shape —
        // analytics needs them to answer "which integrations are getting
        // pushed to" and "which connectors are in use."
        connector: {
          properties: {
            name: { type: 'text' },
            type: { type: 'keyword' },
            fields: {
              properties: {
                key: { type: 'text' },
                value: { type: 'text' },
              },
            },
          },
        },
        external_service: {
          properties: {
            pushed_at: { type: 'date' },
            pushed_by: {
              properties: {
                username: { type: 'keyword' },
                full_name: { type: 'keyword' },
                email: { type: 'keyword' },
                profile_uid: { type: 'keyword' },
              },
            },
            connector_name: { type: 'keyword' },
            external_id: { type: 'keyword' },
            external_title: { type: 'text' },
            external_url: { type: 'text' },
          },
        },
        // Opaque — stored in `_source`, not indexed. `settings` is per-case
        // config (sync alerts, extract observables) that isn't a useful
        // analytics dimension; analysts care about case content, not its
        // toggles.
        settings: { type: 'object', enabled: false },
        // `customFields`: matches the SO mapping exactly — nested array,
        // multi-fielded value so users can filter typed sub-fields (number,
        // boolean, string, date, ip). `ignore_malformed: true` keeps the
        // index write resilient if a user enters a value that doesn't fit
        // its declared type. Note: the templates system will eventually
        // supersede custom fields, at which point this can be simplified
        // alongside that migration.
        customFields: {
          type: 'nested',
          properties: {
            key: { type: 'keyword' },
            type: { type: 'keyword' },
            value: {
              type: 'keyword',
              fields: {
                number: { type: 'long', ignore_malformed: true },
                boolean: { type: 'boolean', ignore_malformed: true },
                string: { type: 'text' },
                date: { type: 'date', ignore_malformed: true },
                ip: { type: 'ip', ignore_malformed: true },
              },
            },
          },
        },
        // `observables`: **denormalized** from the SO's nested
        // `{ typeKey, value, description }` array into a flat object keyed by
        // observable type — `cases.observables.<typeKey>: keyword[]`. This
        // gives natural term queries (`cases.observables.url: "http://..."`)
        // without nested-aggregation overhead, while preserving the
        // type↔value relationship via the field path.
        //
        // `description` is intentionally dropped — it's free text per
        // observable, not an analytics dimension. The full triple is still
        // available on the case SO for detail views.
        //
        // `dynamic: true` here scopes dynamic mapping to this subtree (the
        // parent stays `dynamic: 'strict'`). Children are forced to keyword
        // by `CASE_DYNAMIC_TEMPLATES.observables_keyword`.
        observables: { type: 'object', dynamic: true },
        // Children dynamically mapped to keyword via
        // `CASE_DYNAMIC_TEMPLATES.extended_fields_keyword`. `dynamic: true`
        // here scopes the dynamic behaviour to this subtree and does not
        // relax the parent's `dynamic: 'strict'`. Typed querying happens via
        // runtime fields published at `cases.<snake>` — see
        // `data_view/runtime_fields.ts` (added in a later commit) for the
        // lift.
        extended_fields: { type: 'object', dynamic: true },
      },
    },
  },
};
