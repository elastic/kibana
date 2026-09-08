/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { PolicyExecutionHistoryItem } from '@kbn/alerting-v2-schemas';
import {
  COLUMN_TIMESTAMP,
  COLUMN_POLICY,
  COLUMN_OUTCOME,
  COLUMN_RULES,
  COLUMN_EPISODES,
  COLUMN_ACTION_GROUPS,
  COLUMN_WORKFLOWS,
} from '../translations';
import { displayField, useAdHocDataView } from './create_ad_hoc_data_view';

// Field (column) ids for the policy executions ad-hoc data view. Every policy column maps to a
// top-level payload field, so all ids are tied to the schema (drift guard): a top-level rename in
// `@kbn/alerting-v2-schemas` becomes a compile error here.
export const POLICY_EXECUTION_FIELDS = {
  dispatchedAt: 'dispatched_at',
  policy: 'policy',
  outcome: 'outcome',
  rules: 'rules',
  episodeCount: 'episode_count',
  actionGroupCount: 'action_group_count',
  workflows: 'workflows',
} as const satisfies Record<string, keyof PolicyExecutionHistoryItem>;

// In-memory data view — the `title` does not resolve to any real index. The timestamp is declared
// as a regular field (not `timeFieldName`) to keep it an explicitly-rendered column and avoid a
// duplicate time column from `UnifiedDataTable`. All fields are declared here; the table config
// decides which are visible (e.g. the episode/rule columns are conditional per consumer).
const POLICY_EXECUTIONS_DATA_VIEW_SPEC: DataViewSpec = {
  id: 'alerting-v2-policy-executions',
  title: 'alerting-v2-policy-executions',
  fields: {
    [POLICY_EXECUTION_FIELDS.dispatchedAt]: displayField(
      POLICY_EXECUTION_FIELDS.dispatchedAt,
      'date',
      COLUMN_TIMESTAMP
    ),
    [POLICY_EXECUTION_FIELDS.policy]: displayField(
      POLICY_EXECUTION_FIELDS.policy,
      'string',
      COLUMN_POLICY
    ),
    [POLICY_EXECUTION_FIELDS.outcome]: displayField(
      POLICY_EXECUTION_FIELDS.outcome,
      'string',
      COLUMN_OUTCOME
    ),
    [POLICY_EXECUTION_FIELDS.rules]: displayField(
      POLICY_EXECUTION_FIELDS.rules,
      'string',
      COLUMN_RULES
    ),
    [POLICY_EXECUTION_FIELDS.episodeCount]: displayField(
      POLICY_EXECUTION_FIELDS.episodeCount,
      'number',
      COLUMN_EPISODES
    ),
    [POLICY_EXECUTION_FIELDS.actionGroupCount]: displayField(
      POLICY_EXECUTION_FIELDS.actionGroupCount,
      'number',
      COLUMN_ACTION_GROUPS
    ),
    [POLICY_EXECUTION_FIELDS.workflows]: displayField(
      POLICY_EXECUTION_FIELDS.workflows,
      'string',
      COLUMN_WORKFLOWS
    ),
  },
};

export const usePolicyExecutionsDataView = () => useAdHocDataView(POLICY_EXECUTIONS_DATA_VIEW_SPEC);
