/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { EXTENDED_FIELDS_DYNAMIC_TEMPLATES } from './extended_fields';

/**
 * Mapping for the `.cases` analytics index. One document per case, keyed on
 * the case saved-object id.
 *
 * `dynamic: 'strict'` — any field the doc-builder emits that isn't declared
 * here will fail the write with `mapper_parsing_exception`. We prefer this over
 * `dynamic: false` because silent drops are a foot-gun: the writer's
 * fire-and-forget contract means a strict failure surfaces in error logs, but
 * a dropped field looks identical to "the feature isn't wired up." A
 * round-trip schema-drift guard test (added with the doc-builder in a later
 * commit) protects against accidental drift.
 *
 * Field group conventions, mirroring how alerts-as-data shapes its docs:
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
 * Free-form blobs (`connector`, `external_service`, `settings`, `observables`,
 * `custom_fields`) are stored with `enabled: false`. They round-trip in the
 * source document but aren't indexed field-by-field — Lens / Discover treat
 * them as opaque. If a future use case needs to filter on, say,
 * `cases.connector.type`, we promote that subfield in the mapping at that
 * point (and document the shape change in the README).
 */
export const CASE_INDEX_MAPPING: MappingTypeMapping = {
  dynamic: 'strict',
  dynamic_templates: EXTENDED_FIELDS_DYNAMIC_TEMPLATES,
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
        status: { type: 'keyword' },
        severity: { type: 'keyword' },
        assignees: {
          type: 'nested',
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
        // Counters — `long` because comment / alert volumes on a hot case can
        // exceed `integer` (2^31) over time, and the storage cost of `long`
        // vs `integer` for a single-doc-per-case index is negligible.
        total_alerts: { type: 'long' },
        total_comments: { type: 'long' },
        total_events: { type: 'long' },
        total_observables: { type: 'long' },
        // Time-deltas are stored in milliseconds — same convention the cases
        // SO uses for its `duration` / `time_to_*` fields. Documented in the
        // README so dashboards interpret correctly.
        duration: { type: 'long' },
        time_to_acknowledge: { type: 'long' },
        time_to_investigate: { type: 'long' },
        time_to_resolve: { type: 'long' },
        incremental_id: { type: 'long' },
        template: {
          properties: {
            id: { type: 'keyword' },
            version: { type: 'long' },
          },
        },
        // Free-form sub-objects we don't index field-by-field. Stored opaque.
        observables: { type: 'object', enabled: false },
        custom_fields: { type: 'object', enabled: false },
        connector: { type: 'object', enabled: false },
        external_service: { type: 'object', enabled: false },
        settings: { type: 'object', enabled: false },
        // Children dynamically mapped via `EXTENDED_FIELDS_DYNAMIC_TEMPLATES`.
        // `dynamic: true` here scopes the dynamic mapping to this subtree and
        // does not relax the parent's `dynamic: 'strict'`.
        extended_fields: { type: 'object', dynamic: true },
      },
    },
  },
};
