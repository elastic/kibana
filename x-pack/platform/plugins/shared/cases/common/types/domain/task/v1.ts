/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserRt } from '../user/v1';

export const CaseTaskStatusRt = rt.string;

export const TaskStatusDefinitionRt = rt.intersection([
  rt.strict({
    key: rt.string,
    label: rt.string,
    color: rt.string,
  }),
  rt.exact(rt.partial({ disabled: rt.boolean })),
]);

export const TaskStatusesConfigurationRt = rt.array(TaskStatusDefinitionRt);

/** Keys of the four built-in statuses that can be disabled but never deleted. */
export const BUILTIN_STATUS_KEYS: ReadonlySet<string> = new Set([
  'open',
  'in_progress',
  'done',
  'cancelled',
]);

export const DEFAULT_TASK_STATUSES: Array<rt.TypeOf<typeof TaskStatusDefinitionRt>> = [
  { key: 'open', label: 'Open', color: 'default' },
  { key: 'in_progress', label: 'In progress', color: 'primary' },
  { key: 'done', label: 'Done', color: 'success' },
  { key: 'cancelled', label: 'Cancelled', color: 'default' },
];

/**
 * Merge stored task statuses with the 4 built-in defaults.
 * Built-ins always appear first, preserving any stored overrides (label/color/disabled).
 * Custom statuses (not in BUILTIN_STATUS_KEYS) are appended after.
 */
export function mergeTaskStatusesWithDefaults(
  stored: TaskStatusDefinition[]
): TaskStatusDefinition[] {
  const storedByKey = new Map(stored.map((s) => [s.key, s]));
  const builtins = DEFAULT_TASK_STATUSES.map((def) => storedByKey.get(def.key) ?? def);
  const custom = stored.filter((s) => !BUILTIN_STATUS_KEYS.has(s.key));
  return [...builtins, ...custom];
}

export const CaseTaskPriorityRt = rt.keyof({
  low: null,
  medium: null,
  high: null,
  critical: null,
});

export const CaseTaskCustomFieldRt = rt.strict({
  key: rt.string,
  type: rt.keyof({ text: null, toggle: null, number: null, date: null }),
  value: rt.union([rt.string, rt.boolean, rt.number, rt.null]),
});

export const CaseTaskAssigneeRt = rt.strict({
  uid: rt.string,
});

export const CaseTaskAttributesRt = rt.intersection([
  rt.strict({
    title: rt.string,
    description: rt.string,
    case_id: rt.string,
    parent_task_id: rt.union([rt.string, rt.null]),
    status: CaseTaskStatusRt,
    priority: CaseTaskPriorityRt,
    assignees: rt.array(CaseTaskAssigneeRt),
    due_date: rt.union([rt.string, rt.null]),
    started_at: rt.union([rt.string, rt.null]),
    completed_at: rt.union([rt.string, rt.null]),
    sort_order: rt.number,
    template_id: rt.union([rt.string, rt.null]),
    custom_fields: rt.array(CaseTaskCustomFieldRt),
    required_role: rt.union([rt.string, rt.null]),
    owner_team: rt.union([rt.string, rt.null]),
    owner: rt.string,
    created_at: rt.string,
    created_by: UserRt,
    updated_at: rt.union([rt.string, rt.null]),
    updated_by: rt.union([UserRt, rt.null]),
  }),
  rt.exact(rt.partial({
    completion_notes: rt.union([rt.string, rt.null]),
  })),
]);

export const CaseTaskRt = rt.intersection([
  CaseTaskAttributesRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CaseTasksRt = rt.array(CaseTaskRt);

export const CaseTaskSummaryRt = rt.strict({
  total: rt.number,
  open: rt.number,
  in_progress: rt.number,
  completed: rt.number,
  cancelled: rt.number,
  next_due_date: rt.union([rt.string, rt.null]),
});

export type CaseTaskStatus = rt.TypeOf<typeof CaseTaskStatusRt>;
export type TaskStatusDefinition = rt.TypeOf<typeof TaskStatusDefinitionRt>;
export type TaskStatusesConfiguration = rt.TypeOf<typeof TaskStatusesConfigurationRt>;
export type CaseTaskPriority = rt.TypeOf<typeof CaseTaskPriorityRt>;
export type CaseTaskAssignee = rt.TypeOf<typeof CaseTaskAssigneeRt>;
export type CaseTaskCustomField = rt.TypeOf<typeof CaseTaskCustomFieldRt>;
export type CaseTaskAttributes = rt.TypeOf<typeof CaseTaskAttributesRt>;
export type CaseTask = rt.TypeOf<typeof CaseTaskRt>;
export type CaseTasks = rt.TypeOf<typeof CaseTasksRt>;
export type CaseTaskSummary = rt.TypeOf<typeof CaseTaskSummaryRt>;
