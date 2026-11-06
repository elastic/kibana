/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UserSchema } from '../user/v1';
import { CaseTaskPrioritySchema } from '../task/v1';

export const DueWithinUnitSchema = z.enum(['minutes', 'hours', 'days']);

/** Relative deadline, resolved against the time the list is applied. */
export const DueWithinSchema = z.object({
  value: z.number(),
  unit: DueWithinUnitSchema,
});

/**
 * A reusable task list. Applying it to a case creates one task per entry, in array order.
 */
export const CaseTaskTemplateSubtaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: CaseTaskPrioritySchema,
  required: z.boolean(),
  due_within: DueWithinSchema.nullable(),
});

export const CaseTaskTemplateTaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: CaseTaskPrioritySchema,
  required: z.boolean(),
  due_within: DueWithinSchema.nullable(),
  subtasks: z.array(CaseTaskTemplateSubtaskSchema),
  /** A workflow the task runs; copied to the task when the list is applied. */
  workflow_id: z.string().min(1).nullable().optional(),
});

export const CaseTaskTemplateAttributesSchema = z.object({
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  tasks: z.array(CaseTaskTemplateTaskSchema),
  owner: z.string(),
  created_at: z.string(),
  created_by: UserSchema,
  updated_at: z.string().nullable(),
  updated_by: UserSchema.nullable(),
});

export const CaseTaskTemplateSchema = CaseTaskTemplateAttributesSchema.extend({
  id: z.string(),
  version: z.string(),
});

export const CaseTaskTemplatesSchema = z.array(CaseTaskTemplateSchema);

export type DueWithinUnit = z.infer<typeof DueWithinUnitSchema>;
export type DueWithin = z.infer<typeof DueWithinSchema>;
export type CaseTaskTemplateSubtask = z.infer<typeof CaseTaskTemplateSubtaskSchema>;
export type CaseTaskTemplateTask = z.infer<typeof CaseTaskTemplateTaskSchema>;
export type CaseTaskTemplateAttributes = z.infer<typeof CaseTaskTemplateAttributesSchema>;
export type CaseTaskTemplate = z.infer<typeof CaseTaskTemplateSchema>;
export type CaseTaskTemplates = z.infer<typeof CaseTaskTemplatesSchema>;
