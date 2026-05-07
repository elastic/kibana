/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { CasePersistedAttributes } from '../../common/types/case';
import { CasePersistedStatus } from '../../common/types/case';
import type { UserActionPersistedAttributes } from '../../common/types/user_actions';

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

export interface CaseLifecycleAnalyticsDoc {
  '@timestamp': string;
  kibana: { space_ids: string[] };
  cases: {
    owner: string;
    id: string;
    extended_fields?: Record<string, string>;
  };
  case_lifecycle: {
    final_status: string;
    final_severity: string;
    time_to_first_response_ms?: number;
    time_to_close_ms?: number;
    time_open_ms?: number;
    total_comments: number;
    total_assignee_changes: number;
    total_status_changes: number;
    created_at: string;
    closed_at?: string;
  };
}

/**
 * Build a `.cases-data.case_lifecycle` document by reducing the case + its activity
 * history into a single denormalized row.
 *
 * Recomputed on every status transition (close/reopen) by the writer's
 * `recomputeLifecycle(caseId)` entry point. The writer is responsible for fetching
 * the case SO and the user-action history; this builder is pure.
 */
export const buildLifecycleDoc = (
  caseSO: SavedObject<CasePersistedAttributes>,
  activitySOs: Array<SavedObject<UserActionPersistedAttributes>>,
  now: () => string = () => new Date().toISOString()
): CaseLifecycleAnalyticsDoc => {
  const { attributes, namespaces } = caseSO;
  const sortedActivity = [...activitySOs].sort(
    (a, b) =>
      new Date(a.attributes.created_at).getTime() - new Date(b.attributes.created_at).getTime()
  );

  const stats = computeStats(caseSO, sortedActivity);

  return {
    '@timestamp': now(),
    kibana: {
      space_ids: namespaces ?? ['default'],
    },
    cases: {
      owner: attributes.owner,
      id: caseSO.id,
      ...(attributes.extended_fields != null
        ? { extended_fields: passthroughExtendedFields(attributes.extended_fields) }
        : {}),
    },
    case_lifecycle: {
      final_status: STATUS_LABEL_BY_NUMBER[attributes.status] ?? String(attributes.status),
      final_severity: SEVERITY_LABEL_BY_NUMBER[attributes.severity] ?? String(attributes.severity),
      ...stats,
      created_at: attributes.created_at,
      ...(attributes.closed_at != null ? { closed_at: attributes.closed_at } : {}),
    },
  };
};

const computeStats = (
  caseSO: SavedObject<CasePersistedAttributes>,
  sortedActivity: Array<SavedObject<UserActionPersistedAttributes>>
): {
  time_to_first_response_ms?: number;
  time_to_close_ms?: number;
  time_open_ms?: number;
  total_comments: number;
  total_assignee_changes: number;
  total_status_changes: number;
} => {
  const { attributes } = caseSO;
  const createdAt = new Date(attributes.created_at).getTime();

  let firstResponseAt: number | undefined;
  let total_comments = 0;
  let total_assignee_changes = 0;
  let total_status_changes = 0;

  for (const ua of sortedActivity) {
    const { type, action } = ua.attributes;
    if (type === 'comment' && action === 'create') {
      total_comments += 1;
      if (firstResponseAt == null) {
        firstResponseAt = new Date(ua.attributes.created_at).getTime();
      }
    } else if (type === 'assignees') {
      total_assignee_changes += 1;
    } else if (type === 'status') {
      total_status_changes += 1;
    }
  }

  const closedAt = attributes.closed_at ? new Date(attributes.closed_at).getTime() : undefined;
  const nowTs = Date.now();

  return {
    ...(firstResponseAt != null ? { time_to_first_response_ms: firstResponseAt - createdAt } : {}),
    ...(closedAt != null ? { time_to_close_ms: closedAt - createdAt } : {}),
    time_open_ms: (closedAt ?? nowTs) - createdAt,
    total_comments: total_comments || (attributes.total_comments ?? 0),
    total_assignee_changes,
    total_status_changes,
  };
};

/**
 * Pass-through projection for extended fields. See
 * `case_doc_builder.ts#passthroughExtendedFields` for rationale — same
 * design at this surface (keyword-only storage, runtime fields layered on
 * top at the data view).
 */
const passthroughExtendedFields = (raw: Record<string, unknown>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    out[key] = String(value);
  }
  return out;
};
