/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  'time_to_acknowledge = cases.time_to_acknowledge',
  'time_to_investigate = cases.time_to_investigate',
  'time_to_resolve = cases.time_to_resolve',
  'custom_fields_keys = cases.customFields.key',
  'custom_fields_types = cases.customFields.type',
  'custom_fields_values = cases.customFields.value',
  'observables_types = cases.observables.typeKey',
  'observables_values = cases.observables.value',
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
  'custom_fields_keys',
  'custom_fields_types',
  'custom_fields_values',
  'observables_types',
  'observables_values',
];

/**
 * One row per case SO. `templateFields` is the union of (name, type) pairs
 * across every cases-templates SO; each pair becomes an EVAL'd column
 * with a JSON_EXTRACT-based read and a TO_* cast appropriate for the type.
 *
 * The output column set is stable across regenerations: column order is
 * always [base columns, ...extended-field columns in input order]. This
 * keeps Lens / Discover saved queries from breaking when a new template
 * field is added.
 */
export const buildCaseViewQuery = (templateFields: TemplateFieldRef[]): string => {
  const extendedEvals = extendedFieldsToEval(templateFields);
  const allEvals = [...CASE_BASE_EVALS, ...extendedEvals.map((e) => e.evalLine)];
  const allKeepColumns = [...CASE_BASE_KEEP_COLUMNS, ...extendedEvals.map((e) => e.camelKey)];
  return [
    `FROM ${CAI_VIEW_SOURCE_INDEX} METADATA _id, _source`,
    `| WHERE type == "cases"`,
    `| EVAL ${allEvals.join(', ')}`,
    `| KEEP ${allKeepColumns.join(', ')}`,
  ].join('\n');
};
