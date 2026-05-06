/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { UserActionPersistedAttributes } from '../../common/types/user_actions';

export interface CaseActivityAnalyticsDoc {
  '@timestamp': string;
  kibana: { space_ids: string[] };
  cases: {
    owner: string;
    id: string;
  };
  case_activity: {
    id: string;
    action: string;
    type: string;
    payload: Record<string, unknown>;
    created_at: string;
    created_by: {
      username?: string;
      full_name?: string;
      email?: string;
      profile_uid?: string;
    };
  };
}

/**
 * Build a `.cases-data.case_activity` document from a user-action SO.
 *
 * `cases.id` is extracted from the SO's references (`{ type: 'cases', id: '...' }`).
 * If the user-action SO is missing a case reference (shouldn't happen in practice),
 * the builder returns null so the writer can drop the row rather than emit a
 * doc with no join key.
 */
export const buildActivityDoc = (
  so: SavedObject<UserActionPersistedAttributes>,
  now: () => string = () => new Date().toISOString()
): CaseActivityAnalyticsDoc | null => {
  const caseId = extractCaseId(so.references);
  if (!caseId) return null;

  const { attributes, namespaces } = so;

  return {
    '@timestamp': now(),
    kibana: {
      space_ids: namespaces ?? ['default'],
    },
    cases: {
      owner: attributes.owner,
      id: caseId,
    },
    case_activity: {
      id: so.id,
      action: attributes.action,
      type: attributes.type,
      payload: attributes.payload ?? {},
      created_at: attributes.created_at,
      created_by: {
        username: attributes.created_by?.username ?? undefined,
        full_name: attributes.created_by?.full_name ?? undefined,
        email: attributes.created_by?.email ?? undefined,
        profile_uid: attributes.created_by?.profile_uid ?? undefined,
      },
    },
  };
};

const extractCaseId = (references: SavedObjectReference[]): string | undefined =>
  references.find((ref) => ref.type === CASE_SAVED_OBJECT)?.id;
