/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserRt } from '../user/v1';
import { CaseTaskPriorityRt } from '../task/v1';

export const DueWithinUnitRt = rt.keyof({ minutes: null, hours: null, days: null });

/** Relative deadline, resolved against the time the list is applied. */
export const DueWithinRt = rt.strict({
  value: rt.number,
  unit: DueWithinUnitRt,
});

/**
 * A reusable task list. Applying it to a case creates one task per entry, in array order.
 */
export const CaseTaskTemplateSubtaskRt = rt.strict({
  title: rt.string,
  description: rt.string,
  priority: CaseTaskPriorityRt,
  required: rt.boolean,
  due_within: rt.union([DueWithinRt, rt.null]),
});

export const CaseTaskTemplateTaskRt = rt.strict({
  title: rt.string,
  description: rt.string,
  priority: CaseTaskPriorityRt,
  required: rt.boolean,
  due_within: rt.union([DueWithinRt, rt.null]),
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

export type DueWithinUnit = rt.TypeOf<typeof DueWithinUnitRt>;
export type DueWithin = rt.TypeOf<typeof DueWithinRt>;
export type CaseTaskTemplateSubtask = rt.TypeOf<typeof CaseTaskTemplateSubtaskRt>;
export type CaseTaskTemplateTask = rt.TypeOf<typeof CaseTaskTemplateTaskRt>;
export type CaseTaskTemplateAttributes = rt.TypeOf<typeof CaseTaskTemplateAttributesRt>;
export type CaseTaskTemplate = rt.TypeOf<typeof CaseTaskTemplateRt>;
export type CaseTaskTemplates = rt.TypeOf<typeof CaseTaskTemplatesRt>;
