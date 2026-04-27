/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Owner } from '../../../common/constants/types';
import { CAI_VIEW_SOURCE_INDEX } from './constants';

const ACTIVITY_EVALS = [
  'user_action_id = _id',
  'action = `cases-user-actions`.action',
  'user_action_type = `cases-user-actions`.type',
  'payload_status = CASE(`cases-user-actions`.type == "status", `cases-user-actions`.payload.status, null)',
  'payload_severity = CASE(`cases-user-actions`.type == "severity", `cases-user-actions`.payload.severity, null)',
  'payload_category = CASE(`cases-user-actions`.type == "category", `cases-user-actions`.payload.category, null)',
  'payload_tags = CASE(`cases-user-actions`.type == "tags", `cases-user-actions`.payload.tags, null)',
  'created_at = TO_DATETIME(`cases-user-actions`.created_at)',
  'created_at_ms = TO_LONG(TO_DATETIME(`cases-user-actions`.created_at))',
  'created_by_username = `cases-user-actions`.created_by.username',
  'created_by_full_name = `cases-user-actions`.created_by.full_name',
  'created_by_email = `cases-user-actions`.created_by.email',
  'created_by_profile_uid = `cases-user-actions`.created_by.profile_uid',
  'owner = `cases-user-actions`.owner',
  'space_ids = namespaces',
  /*
   * Per-reference (id, type) pairs are exposed as parallel multi-value
   * columns rather than a single extracted `case_id`. Snapshot ES|QL
   * does not yet support MV_FILTER lambdas, and the SO `references`
   * array flattens to independent multi-value fields once indexed (the
   * pairing across `.id`/`.type` is lost). To find activity for a
   * specific case_id, consumers either:
   *   1. WHERE <case_id_literal> IN references_ids  (and JOIN against
   *      cases.case.<owner> if they need to confirm the match is a
   *      case ref vs. an alert ref of the same id-shape), OR
   *   2. wait for the writer-side `case_id` mirror landing in a follow-up
   *      change to cases-user-actions SO mapping + service.
   */
  'references_ids = references.id',
  'references_types = references.type',
];

const ACTIVITY_KEEP_COLUMNS = [
  'user_action_id',
  'owner',
  'space_ids',
  'action',
  'user_action_type',
  'payload_status',
  'payload_severity',
  'payload_category',
  'payload_tags',
  'created_at',
  'created_at_ms',
  'created_by_username',
  'created_by_full_name',
  'created_by_email',
  'created_by_profile_uid',
  'references_ids',
  'references_types',
];

/**
 * One row per cases-user-actions SO scoped to a given owner. Activity rows
 * do not consume template extended fields, so this builder is parameterized
 * only by owner. Owner appears in the WHERE clause so the view is
 * solution-scoped at the cluster-state level.
 */
export const buildActivityViewQuery = (owner: Owner): string =>
  [
    `FROM ${CAI_VIEW_SOURCE_INDEX} METADATA _id`,
    `| WHERE type == "cases-user-actions" AND \`cases-user-actions\`.owner == "${owner}"`,
    `| EVAL ${ACTIVITY_EVALS.join(', ')}`,
    `| KEEP ${ACTIVITY_KEEP_COLUMNS.join(', ')}`,
  ].join('\n');
