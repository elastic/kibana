/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserRt } from '../user/v1';
import { CaseTaskPriorityRt } from '../task/v1';

/**
 * A reusable task list. Applying it to a case creates one task per entry, in
 * array order, with `relative_due_days` resolved against the time of applying.
 */
export const CaseTaskTemplateSubtaskRt = rt.strict({
  title: rt.string,
  description: rt.string,
  priority: CaseTaskPriorityRt,
  relative_due_days: rt.union([rt.number, rt.null]),
});

export const CaseTaskTemplateTaskRt = rt.strict({
  title: rt.string,
  description: rt.string,
  priority: CaseTaskPriorityRt,
  relative_due_days: rt.union([rt.number, rt.null]),
  subtasks: rt.array(CaseTaskTemplateSubtaskRt),
});

export const CaseTaskTemplateAttributesRt = rt.strict({
  name: rt.string,
  description: rt.string,
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
