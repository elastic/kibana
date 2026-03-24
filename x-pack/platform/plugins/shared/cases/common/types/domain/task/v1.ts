/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserRt } from '../user/v1';

export const CaseTaskStatusRt = rt.keyof({
  open: null,
  in_progress: null,
  completed: null,
  cancelled: null,
});

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
  rt.exact(rt.partial({})),
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
export type CaseTaskPriority = rt.TypeOf<typeof CaseTaskPriorityRt>;
export type CaseTaskAssignee = rt.TypeOf<typeof CaseTaskAssigneeRt>;
export type CaseTaskCustomField = rt.TypeOf<typeof CaseTaskCustomFieldRt>;
export type CaseTaskAttributes = rt.TypeOf<typeof CaseTaskAttributesRt>;
export type CaseTask = rt.TypeOf<typeof CaseTaskRt>;
export type CaseTasks = rt.TypeOf<typeof CaseTasksRt>;
export type CaseTaskSummary = rt.TypeOf<typeof CaseTaskSummaryRt>;
