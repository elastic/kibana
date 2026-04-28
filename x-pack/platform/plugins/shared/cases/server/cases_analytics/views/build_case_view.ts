/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Owner } from '../../../common/constants/types';
import { CAI_VIEW_SOURCE_INDEX } from './constants';
import { extendedFieldsToEval, type TemplateFieldRef } from './extended_fields_to_eval';

const CASE_BASE_EVALS = [
  'case_id = _id',
  'title = cases.title',
  'description = cases.description',
  'tags = cases.tags',
  'category = cases.category',
  'status = CASE(cases.status == 0, "open", cases.status == 10, "in-progress", cases.status == 20, "closed", "")',
  'status_sort = TO_INTEGER(cases.status)',
  'severity = CASE(cases.severity == 0, "low", cases.severity == 10, "medium", cases.severity == 20, "high", cases.severity == 30, "critical", "")',
  'severity_sort = TO_INTEGER(cases.severity)',
  'created_at = TO_DATETIME(cases.created_at)',
  'created_at_ms = TO_LONG(TO_DATETIME(cases.created_at))',
  'updated_at = TO_DATETIME(cases.updated_at)',
  'updated_at_ms = TO_LONG(TO_DATETIME(cases.updated_at))',
  'closed_at = TO_DATETIME(cases.closed_at)',
  'closed_at_ms = TO_LONG(TO_DATETIME(cases.closed_at))',
  'created_by_username = cases.created_by.username',
  'created_by_full_name = cases.created_by.full_name',
  'created_by_email = cases.created_by.email',
  'created_by_profile_uid = cases.created_by.profile_uid',
  'updated_by_username = cases.updated_by.username',
  'updated_by_full_name = cases.updated_by.full_name',
  'updated_by_email = cases.updated_by.email',
  'updated_by_profile_uid = cases.updated_by.profile_uid',
  'closed_by_username = cases.closed_by.username',
  'closed_by_full_name = cases.closed_by.full_name',
  'closed_by_email = cases.closed_by.email',
  'closed_by_profile_uid = cases.closed_by.profile_uid',
  'assignees = cases.assignees.uid',
  'total_assignees = MV_COUNT(cases.assignees.uid)',
  'owner = cases.owner',
  'space_ids = namespaces',
  'total_alerts = cases.total_alerts',
  'total_comments = cases.total_comments',
  'total_observables = cases.total_observables',
  /*
   * The cases SO mapping is `dynamic: false`, so time_to_acknowledge /
   * time_to_investigate / time_to_resolve are written to _source by the
   * cases service but never indexed as searchable fields. ES|QL can
   * still read them via JSON_EXTRACT against _source, layered with
   * TO_LONG since JSON_EXTRACT always returns a keyword string.
   */
  'time_to_acknowledge = TO_LONG(JSON_EXTRACT(_source, "cases.time_to_acknowledge"))',
  'time_to_investigate = TO_LONG(JSON_EXTRACT(_source, "cases.time_to_investigate"))',
  'time_to_resolve = TO_LONG(JSON_EXTRACT(_source, "cases.time_to_resolve"))',
  /*
   * customFields and observables are mapped as `nested`, which current
   * ES|QL does not read element-wise. Exposing them properly requires
   * either a flattened mirror on the SO layer or future ES|QL nested
   * support; both are deferred. Until then, consumers needing per-row
   * custom-field / observable data should query the source SO directly.
   */
];

const CASE_BASE_KEEP_COLUMNS = [
  'case_id',
  'owner',
  'space_ids',
  'title',
  'description',
  'tags',
  'category',
  'status',
  'status_sort',
  'severity',
  'severity_sort',
  'created_at',
  'created_at_ms',
  'updated_at',
  'updated_at_ms',
  'closed_at',
  'closed_at_ms',
  'created_by_username',
  'created_by_full_name',
  'created_by_email',
  'created_by_profile_uid',
  'updated_by_username',
  'updated_by_full_name',
  'updated_by_email',
  'updated_by_profile_uid',
  'closed_by_username',
  'closed_by_full_name',
  'closed_by_email',
  'closed_by_profile_uid',
  'assignees',
  'total_assignees',
  'total_alerts',
  'total_comments',
  'total_observables',
  'time_to_acknowledge',
  'time_to_investigate',
  'time_to_resolve',
];

/**
 * One row per case SO for the given owner. `templateFields` is the union
 * of (name, type) pairs declared by that owner's cases-templates SOs;
 * each pair becomes an EVAL'd column with a JSON_EXTRACT-based read and
 * a TO_* cast appropriate for the type.
 *
 * Owner appears in the WHERE clause so the view is solution-scoped at
 * the cluster-state level — kibana-cases-security plugin grants role
 * patterns by view name (`cases.case.<owner>`), and namespace DLS
 * inside the SO index handles space isolation.
 *
 * The output column set is stable across regenerations: column order is
 * always [base columns, ...extended-field columns in input order]. This
 * keeps Lens / Discover saved queries from breaking when a new template
 * field is added.
 */
export const buildCaseViewQuery = (owner: Owner, templateFields: TemplateFieldRef[]): string => {
  const extendedEvals = extendedFieldsToEval(templateFields);
  const allEvals = [...CASE_BASE_EVALS, ...extendedEvals.map((e) => e.evalLine)];
  const allKeepColumns = [...CASE_BASE_KEEP_COLUMNS, ...extendedEvals.map((e) => e.columnKey)];
  return [
    `FROM ${CAI_VIEW_SOURCE_INDEX} METADATA _id, _source`,
    `| WHERE type == "cases" AND cases.owner == "${owner}"`,
    `| EVAL ${allEvals.join(', ')}`,
    `| KEEP ${allKeepColumns.join(', ')}`,
  ].join('\n');
};
