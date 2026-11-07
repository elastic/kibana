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

export const CaseTaskWorkflowRunStatusSchema = z.enum(['running', 'succeeded', 'failed']);

/** The last run of the task's workflow. The task completes only when a run succeeds. */
export const CaseTaskWorkflowRunSchema = z.object({
  execution_id: z.string(),
  status: CaseTaskWorkflowRunStatusSchema,
  started_at: z.string(),
  finished_at: z.string().nullable(),
  error: z.string().nullable().optional(),
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
  /** Required tasks must be finished (completed or cancelled) before the case can close. */
  required: z.boolean(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  sort_order: z.number(),
  /** The task list this task was created from, if any. */
  template_id: z.string().nullable(),
  /** Stored unmapped; tasks written before workflows existed have neither field. */
  workflow_id: z.string().nullable().optional(),
  workflow_run: CaseTaskWorkflowRunSchema.nullable().optional(),
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
export type CaseTaskWorkflowRunStatus = z.infer<typeof CaseTaskWorkflowRunStatusSchema>;
export type CaseTaskWorkflowRun = z.infer<typeof CaseTaskWorkflowRunSchema>;
export type CaseTaskAttributes = z.infer<typeof CaseTaskAttributesSchema>;
export type CaseTask = z.infer<typeof CaseTaskSchema>;
export type CaseTasks = z.infer<typeof CaseTasksSchema>;
