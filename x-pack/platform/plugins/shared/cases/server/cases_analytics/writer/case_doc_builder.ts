/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { CasePersistedAttributes } from '../../common/types/case';
import { CasePersistedStatus } from '../../common/types/case';

const STATUS_LABEL_BY_NUMBER: Record<number, string> = {
  [CasePersistedStatus.OPEN]: 'open',
  [CasePersistedStatus.IN_PROGRESS]: 'in-progress',
  [CasePersistedStatus.CLOSED]: 'closed',
};

const SEVERITY_LABEL_BY_NUMBER: Record<number, string> = {
  0: 'low',
  10: 'medium',
  20: 'high',
  30: 'critical',
};

export interface CaseAnalyticsDoc {
  '@timestamp': string;
  kibana: { space_ids: string[] };
  cases: {
    owner: string;
    id: string;
    title: string;
    description: string;
    status: string;
    severity: string;
    tags: string[];
    category?: string;
    assignees: Array<{ uid: string }>;
    created_at: string;
    updated_at?: string;
    closed_at?: string;
    created_by: {
      username?: string;
      full_name?: string;
      email?: string;
      profile_uid?: string;
    };
    duration_ms?: number;
    total_alerts: number;
    total_comments: number;
    observables?: unknown;
    custom_fields?: unknown;
    /**
     * Extended template fields, copied verbatim from the SO. Keys are
     * `<name>_as_<type>` snake-keys (see `common/utils/template_fields.ts`).
     * Stored as keyword in the index; the data view layer adds runtime fields
     * per non-keyword suffix to expose properly typed query semantics.
     */
    extended_fields?: Record<string, string>;
  };
}

/**
 * Build a `.cases-data.case` document from the persisted SO.
 *
 * Pure function — no I/O. Fully unit-testable. The writer pipes the result through
 * `bulk` / `index` separately.
 *
 * Field mapping notes:
 * - `kibana.space_ids` mirrors the SO `namespaces` field. Multi-namespace cases
 *   produce multi-element arrays; single-space cases produce single-element arrays.
 *   `'*'` (any-space) is preserved verbatim — DLS handles the wildcard semantics.
 * - `status` and `severity` are denormalized from numeric persisted values to
 *   their human-readable labels. Lens / Discover users don't see numbers.
 * - `duration_ms` is the SO's `duration` field, which is already in milliseconds.
 *   Renamed to be explicit about units.
 * - `extended_fields` is passed through verbatim. SO storage is already
 *   `Record<string, string>` with snake-key field names that encode declared
 *   type; type-aware querying is layered on at the data view via runtime fields.
 */
export const buildCaseDoc = (
  so: SavedObject<CasePersistedAttributes>,
  /** Override `now` for deterministic tests. */
  now: () => string = () => new Date().toISOString()
): CaseAnalyticsDoc => {
  const { attributes, namespaces } = so;

  return {
    '@timestamp': now(),
    kibana: {
      space_ids: namespaces ?? ['default'],
    },
    cases: {
      owner: attributes.owner,
      id: so.id,
      title: attributes.title,
      description: attributes.description,
      status: STATUS_LABEL_BY_NUMBER[attributes.status] ?? String(attributes.status),
      severity: SEVERITY_LABEL_BY_NUMBER[attributes.severity] ?? String(attributes.severity),
      tags: attributes.tags ?? [],
      ...(attributes.category != null ? { category: attributes.category } : {}),
      assignees: (attributes.assignees ?? []).map((a) => ({ uid: a.uid })),
      created_at: attributes.created_at,
      ...(attributes.updated_at != null ? { updated_at: attributes.updated_at } : {}),
      ...(attributes.closed_at != null ? { closed_at: attributes.closed_at } : {}),
      created_by: {
        username: attributes.created_by?.username ?? undefined,
        full_name: attributes.created_by?.full_name ?? undefined,
        email: attributes.created_by?.email ?? undefined,
        profile_uid: attributes.created_by?.profile_uid ?? undefined,
      },
      ...(attributes.duration != null ? { duration_ms: attributes.duration } : {}),
      total_alerts: attributes.total_alerts ?? 0,
      total_comments: attributes.total_comments ?? 0,
      ...(attributes.observables != null ? { observables: attributes.observables } : {}),
      ...(attributes.customFields != null ? { custom_fields: attributes.customFields } : {}),
      ...(attributes.extended_fields != null
        ? { extended_fields: passthroughExtendedFields(attributes.extended_fields) }
        : {}),
    },
  };
};

/**
 * Pass-through projection for extended fields: SO storage is already typed as
 * `Record<string, string>` with snake-key names that encode declared type
 * (see `common/utils/template_fields.ts#getFieldSnakeKey`). We drop nullish
 * values so they don't materialize as `null` in the index, but otherwise the
 * map is verbatim — every value is keyword-typed in the index, regardless of
 * what the suffix says. The data view layer is responsible for applying
 * type-aware runtime fields on top.
 */
const passthroughExtendedFields = (raw: Record<string, unknown>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    out[key] = String(value);
  }
  return out;
};
