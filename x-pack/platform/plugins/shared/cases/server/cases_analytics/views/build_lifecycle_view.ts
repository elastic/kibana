/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Owner } from '../../../common/constants/types';
import { CAI_VIEW_SOURCE_INDEX } from './constants';

const LIFECYCLE_EVALS = [
  'case_id = _id',
  'created_at_ms = TO_LONG(TO_DATETIME(cases.created_at))',
  'closed_at_ms = TO_LONG(TO_DATETIME(cases.closed_at))',
  'time_to_close_ms = TO_LONG(TO_DATETIME(cases.closed_at)) - TO_LONG(TO_DATETIME(cases.created_at))',
  'status = CASE(cases.status == 0, "open", cases.status == 10, "in-progress", cases.status == 20, "closed", "")',
  'severity = CASE(cases.severity == 0, "low", cases.severity == 10, "medium", cases.severity == 20, "high", cases.severity == 30, "critical", "")',
  'owner = cases.owner',
  'space_ids = namespaces',
  'total_alerts = cases.total_alerts',
  'total_comments = cases.total_comments',
  'total_observables = cases.total_observables',
  'total_assignees = MV_COUNT(cases.assignees.uid)',
  'time_to_acknowledge = cases.time_to_acknowledge',
  'time_to_investigate = cases.time_to_investigate',
  'time_to_resolve = cases.time_to_resolve',
];

const LIFECYCLE_KEEP_COLUMNS = [
  'case_id',
  'owner',
  'space_ids',
  'status',
  'severity',
  'created_at_ms',
  'closed_at_ms',
  'time_to_close_ms',
  'total_alerts',
  'total_comments',
  'total_observables',
  'total_assignees',
  'time_to_acknowledge',
  'time_to_investigate',
  'time_to_resolve',
];

/**
 * One row per case (scoped to an owner) with pre-computed lifecycle
 * metrics — the ES|QL view equivalent of the legacy lifecycle pivot
 * transform. The fields consumed (total_alerts, total_comments, time_to_*)
 * are already maintained by the cases service on each write, so no
 * aggregation across user-actions or comments is required at view-eval
 * time.
 */
export const buildLifecycleViewQuery = (owner: Owner): string =>
  [
    `FROM ${CAI_VIEW_SOURCE_INDEX} METADATA _id`,
    `| WHERE type == "cases" AND cases.owner == "${owner}"`,
    `| EVAL ${LIFECYCLE_EVALS.join(', ')}`,
    `| KEEP ${LIFECYCLE_KEEP_COLUMNS.join(', ')}`,
  ].join('\n');
