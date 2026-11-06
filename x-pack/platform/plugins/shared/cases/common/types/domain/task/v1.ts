/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UserSchema } from '../user/v1';

export const CaseTaskStatusSchema = z.enum(['open', 'in_progress', 'completed', 'cancelled']);

export const CaseTaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const CaseTaskAssigneeSchema = z.object({
  uid: z.string(),
});

export const CaseTaskAttributesSchema = z.object({
  title: z.string(),
  description: z.string(),
  case_id: z.string(),
  parent_task_id: z.string().nullable(),
  status: CaseTaskStatusSchema,
  priority: CaseTaskPrioritySchema,
  assignees: z.array(CaseTaskAssigneeSchema),
  due_date: z.string().nullable(),
  /** Flagged by the SOP author; shown to analysts, not enforced yet. */
  required: z.boolean(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  sort_order: z.number(),
  /** The task list this task was created from, if any. */
  template_id: z.string().nullable(),
  owner: z.string(),
  created_at: z.string(),
  created_by: UserSchema,
  updated_at: z.string().nullable(),
  updated_by: UserSchema.nullable(),
});

export const CaseTaskSchema = CaseTaskAttributesSchema.extend({
  id: z.string(),
  version: z.string(),
});

export const CaseTasksSchema = z.array(CaseTaskSchema);

export type CaseTaskStatus = z.infer<typeof CaseTaskStatusSchema>;
export type CaseTaskPriority = z.infer<typeof CaseTaskPrioritySchema>;
export type CaseTaskAssignee = z.infer<typeof CaseTaskAssigneeSchema>;
export type CaseTaskAttributes = z.infer<typeof CaseTaskAttributesSchema>;
export type CaseTask = z.infer<typeof CaseTaskSchema>;
export type CaseTasks = z.infer<typeof CaseTasksSchema>;
