/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { CasePersistedAttributes } from '../../common/types/case';
import { CasePersistedSeverity, CasePersistedStatus } from '../../common/types/case';

/**
 * Shape of a single document indexed into `.cases`. Mirrors `CASE_INDEX_MAPPING`
 * — every field below has a matching mapping, and the mapping is `dynamic:
 * 'strict'` so adding a field here without updating the mapping fails the write
 * loudly.
 */
export interface CaseAnalyticsDoc {
  '@timestamp': string;
  kibana: {
    space_ids: string[];
  };
  cases: {
    id: string;
    owner: string;
    title: string;
    description: string;
    tags: string[];
    category?: string | null;
    status: CaseStatusString;
    severity: CaseSeverityString;
    assignees?: Array<{ uid: string }>;
    created_at: string;
    updated_at?: string | null;
    closed_at?: string | null;
    in_progress_at?: string | null;
    created_by?: CaseUserDoc;
    updated_by?: CaseUserDoc | null;
    closed_by?: CaseUserDoc | null;
    total_alerts: number;
    total_comments: number;
    total_events?: number;
    total_observables?: number;
    duration?: number | null;
    time_to_acknowledge?: number | null;
    time_to_investigate?: number | null;
    time_to_resolve?: number | null;
    incremental_id?: number | null;
    template?: { id: string; version: number } | null;
    observables?: unknown[];
    custom_fields?: unknown[];
    connector?: unknown;
    external_service?: unknown;
    settings?: unknown;
    extended_fields?: Record<string, unknown>;
  };
}

interface CaseUserDoc {
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  profile_uid?: string;
}

type CaseStatusString = 'open' | 'in-progress' | 'closed';
type CaseSeverityString = 'low' | 'medium' | 'high' | 'critical';

/**
 * The case SO stores `status` and `severity` as numeric enums for sortability
 * and indexing efficiency. Analytics consumers (Lens, ES|QL) expect human
 * strings. The maps below are the source of truth for the conversion — keep
 * them aligned with `CasePersistedSeverity` / `CasePersistedStatus` in
 * `server/common/types/case.ts`.
 */
const STATUS_TO_STRING: Record<CasePersistedStatus, CaseStatusString> = {
  [CasePersistedStatus.OPEN]: 'open',
  [CasePersistedStatus.IN_PROGRESS]: 'in-progress',
  [CasePersistedStatus.CLOSED]: 'closed',
};

const SEVERITY_TO_STRING: Record<CasePersistedSeverity, CaseSeverityString> = {
  [CasePersistedSeverity.LOW]: 'low',
  [CasePersistedSeverity.MEDIUM]: 'medium',
  [CasePersistedSeverity.HIGH]: 'high',
  [CasePersistedSeverity.CRITICAL]: 'critical',
};

/**
 * Pure transformation: case saved-object → analytics doc.
 *
 * Side-effect-free, deterministic, and safe to call from any context. Tests
 * (added in commit 8) round-trip a synthetic SO and assert every emitted dotted
 * path resolves in the mapping — that's the schema-drift guard.
 *
 * `@timestamp` is set to the most recent activity on the case — `updated_at`
 * if present, otherwise `created_at`. Discover/Lens use `@timestamp` for time
 * picker filtering; aligning it to "last activity" makes the time picker
 * intuitive ("show me cases active in the last 24h").
 */
export function buildCaseDoc(so: SavedObject<CasePersistedAttributes>): CaseAnalyticsDoc {
  const a = so.attributes;
  const timestamp = a.updated_at ?? a.created_at;

  return {
    '@timestamp': timestamp,
    kibana: {
      // `namespaces` is the multi-namespace API that core SO returns. For
      // namespace-scoped types like `cases` it'll be a single-element array of
      // the space id. Default to `['default']` if absent so the field is
      // always populated.
      space_ids: so.namespaces ?? ['default'],
    },
    cases: {
      id: so.id,
      owner: a.owner,
      title: a.title,
      description: a.description,
      tags: a.tags,
      category: a.category,
      status: STATUS_TO_STRING[a.status],
      severity: SEVERITY_TO_STRING[a.severity],
      assignees: a.assignees,
      created_at: a.created_at,
      updated_at: a.updated_at,
      closed_at: a.closed_at,
      in_progress_at: a.in_progress_at,
      created_by: toUserDoc(a.created_by),
      updated_by: toUserDoc(a.updated_by),
      closed_by: toUserDoc(a.closed_by),
      total_alerts: a.total_alerts,
      total_comments: a.total_comments,
      total_events: a.total_events,
      total_observables: a.total_observables,
      duration: a.duration,
      time_to_acknowledge: a.time_to_acknowledge,
      time_to_investigate: a.time_to_investigate,
      time_to_resolve: a.time_to_resolve,
      incremental_id: a.incremental_id,
      template: a.template,
      // Free-form blobs — passed through opaque. The mapping has them as
      // `enabled: false`, so ES stores but doesn't index them.
      observables: a.observables,
      custom_fields: a.customFields,
      connector: a.connector,
      external_service: a.external_service,
      settings: a.settings,
      extended_fields: a.extended_fields ?? undefined,
    },
  };
}

/** Defensive null-handling for the `*_by` user fields. */
function toUserDoc(user: CasePersistedAttributes['created_by'] | null): CaseUserDoc | undefined {
  if (user == null) return undefined;
  return {
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    profile_uid: user.profile_uid,
  };
}
