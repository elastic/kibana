/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserRt } from '../user/v1';
import { CaseTaskPriorityRt } from '../task/v1';

export const CaseTaskTemplateSubtaskRt = rt.strict({
  title: rt.string,
  description: rt.string,
  priority: CaseTaskPriorityRt,
  relative_due_days: rt.union([rt.number, rt.null]),
  sort_order: rt.number,
});

export const CaseTaskTemplateTaskRt = rt.strict({
  title: rt.string,
  description: rt.string,
  priority: CaseTaskPriorityRt,
  relative_due_days: rt.union([rt.number, rt.null]),
  sort_order: rt.number,
  subtasks: rt.array(CaseTaskTemplateSubtaskRt),
});

export const CaseTaskTemplateAttributesRt = rt.strict({
  name: rt.string,
  description: rt.string,
  scope: rt.keyof({ global: null, space: null }),
  tags: rt.array(rt.string),
  tasks: rt.array(CaseTaskTemplateTaskRt),
  owner: rt.string,
  created_at: rt.string,
  created_by: UserRt,
  updated_at: rt.union([rt.string, rt.null]),
  updated_by: rt.union([UserRt, rt.null]),
});

export const CaseTaskTemplateRt = rt.intersection([
  CaseTaskTemplateAttributesRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CaseTaskTemplatesRt = rt.array(CaseTaskTemplateRt);

export type CaseTaskTemplateSubtask = rt.TypeOf<typeof CaseTaskTemplateSubtaskRt>;
export type CaseTaskTemplateTask = rt.TypeOf<typeof CaseTaskTemplateTaskRt>;
export type CaseTaskTemplateAttributes = rt.TypeOf<typeof CaseTaskTemplateAttributesRt>;
export type CaseTaskTemplate = rt.TypeOf<typeof CaseTaskTemplateRt>;
export type CaseTaskTemplates = rt.TypeOf<typeof CaseTaskTemplatesRt>;
