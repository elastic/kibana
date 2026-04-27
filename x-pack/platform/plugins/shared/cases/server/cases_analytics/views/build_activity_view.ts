/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
   * `case_id` is sourced from the SO `references` array where type=="cases".
   * MV_FIRST(MV_FILTER(...)) is the documented ES|QL idiom for predicate
   * extraction on multi-valued sub-fields. If the snapshot ES build does
   * not yet support nested predicates on object arrays, the fallback is
   * to mirror the case-id into a top-level keyword on user-action SO write
   * — see plan §"Open question — case_id for activity rows".
   */
  'case_id = MV_FIRST(MV_FILTER(references.id, ref_id -> ref_id != null))',
];

const ACTIVITY_KEEP_COLUMNS = [
  'user_action_id',
  'case_id',
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
];

/**
 * One row per cases-user-actions SO. Activity rows do not consume template
 * extended fields, so this builder takes no parameters.
 */
export const buildActivityViewQuery = (): string =>
  [
    `FROM ${CAI_VIEW_SOURCE_INDEX} METADATA _id`,
    `| WHERE type == "cases-user-actions"`,
    `| EVAL ${ACTIVITY_EVALS.join(', ')}`,
    `| KEEP ${ACTIVITY_KEEP_COLUMNS.join(', ')}`,
  ].join('\n');
