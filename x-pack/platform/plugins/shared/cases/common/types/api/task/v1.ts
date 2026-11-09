/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_ASSIGNEES_PER_CASE,
  MAX_COMMENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_LENGTH_PER_TAG,
  MAX_TAGS_PER_CASE,
  MAX_TASKS_PER_CASE,
  MAX_TITLE_LENGTH,
} from '../../../constants';
import { limitedArraySchema, limitedStringSchema, paginationSchema } from '../../../schema';
import {
  CaseTaskAssigneeSchema,
  CaseTaskPrioritySchema,
  CaseTaskSchema,
  CaseTaskStatusSchema,
} from '../../domain/task/v1';
import { CaseTaskTemplateTaskSchema, CaseTaskTemplateSchema } from '../../domain/task_template/v1';
import { CaseTaskCommentSchema } from '../../domain/task_comment/v1';

const TitleSchema = limitedStringSchema({ fieldName: 'title', min: 1, max: MAX_TITLE_LENGTH });
const DescriptionSchema = limitedStringSchema({
  fieldName: 'description',
  min: 0,
  max: MAX_DESCRIPTION_LENGTH,
});
const AssigneesSchema = limitedArraySchema({
  codec: CaseTaskAssigneeSchema,
  fieldName: 'assignees',
  min: 0,
  max: MAX_ASSIGNEES_PER_CASE,
});

export const TaskCreateRequestSchema = z.object({
  title: TitleSchema,
  description: DescriptionSchema.optional(),
  status: CaseTaskStatusSchema.optional(),
  priority: CaseTaskPrioritySchema.optional(),
  assignees: AssigneesSchema.optional(),
  due_date: z.string().nullable().optional(),
  required: z.boolean().optional(),
  parent_task_id: z.string().nullable().optional(),
  workflow_id: z.string().min(1).nullable().optional(),
});

export const TaskPatchRequestSchema = z.object({
  version: z.string(),
  title: TitleSchema.optional(),
  description: DescriptionSchema.optional(),
  status: CaseTaskStatusSchema.optional(),
  priority: CaseTaskPrioritySchema.optional(),
  assignees: AssigneesSchema.optional(),
  due_date: z.string().nullable().optional(),
  required: z.boolean().optional(),
  workflow_id: z.string().min(1).nullable().optional(),
});

export const TasksFindRequestSchema = paginationSchema({ maxPerPage: MAX_TASKS_PER_CASE }).extend({
  status: z.union([CaseTaskStatusSchema, z.array(CaseTaskStatusSchema)]).optional(),
  assignees: z.union([z.string(), z.array(z.string())]).optional(),
  owner: z.union([z.string(), z.array(z.string())]).optional(),
  search: z.string().optional(),
  sortField: z.enum(['sort_order', 'created_at', 'due_date']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const TasksReorderRequestSchema = z.object({
  task_ids: limitedArraySchema({
    codec: z.string(),
    fieldName: 'task_ids',
    min: 1,
    max: MAX_TASKS_PER_CASE,
  }),
});

export const TasksResponseSchema = z.object({
  tasks: z.array(CaseTaskSchema),
  /** Comment count per task id; tasks without comments are absent. */
  comment_counts: z.record(z.string(), z.number()),
});

export const TaskCommentCreateRequestSchema = z.object({
  comment: limitedStringSchema({ fieldName: 'comment', min: 1, max: MAX_COMMENT_LENGTH }),
});

export const TaskCommentsResponseSchema = z.object({
  comments: z.array(CaseTaskCommentSchema),
  total: z.number(),
});

export const TasksFindResponseSchema = z.object({
  tasks: z.array(CaseTaskSchema),
  page: z.number(),
  per_page: z.number(),
  total: z.number(),
});

/**
 * Task lists (reusable templates of tasks)
 */
const TemplateTasksSchema = limitedArraySchema({
  codec: CaseTaskTemplateTaskSchema,
  fieldName: 'tasks',
  min: 1,
  max: MAX_TASKS_PER_CASE,
});

const TemplateTagsSchema = limitedArraySchema({
  codec: limitedStringSchema({ fieldName: 'tags', min: 1, max: MAX_LENGTH_PER_TAG }),
  fieldName: 'tags',
  min: 0,
  max: MAX_TAGS_PER_CASE,
});

export const TaskTemplateCreateRequestSchema = z.object({
  name: limitedStringSchema({ fieldName: 'name', min: 1, max: MAX_TITLE_LENGTH }),
  tasks: TemplateTasksSchema,
  owner: z.string(),
  description: DescriptionSchema.optional(),
  tags: TemplateTagsSchema.optional(),
});

export const TaskTemplatePatchRequestSchema = z.object({
  version: z.string(),
  name: limitedStringSchema({ fieldName: 'name', min: 1, max: MAX_TITLE_LENGTH }).optional(),
  description: DescriptionSchema.optional(),
  tags: TemplateTagsSchema.optional(),
  tasks: TemplateTasksSchema.optional(),
});

export const TaskTemplatesFindRequestSchema = z.object({
  owner: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  search: z.string().optional(),
});

export const TaskTemplatesResponseSchema = z.object({
  templates: z.array(CaseTaskTemplateSchema),
  total: z.number(),
});

export const ApplyTaskTemplateRequestSchema = z.object({ template_id: z.string() });

export type TaskCreateRequest = z.infer<typeof TaskCreateRequestSchema>;
export type TaskPatchRequest = z.infer<typeof TaskPatchRequestSchema>;
export type TasksFindRequest = z.infer<typeof TasksFindRequestSchema>;
export type TasksReorderRequest = z.infer<typeof TasksReorderRequestSchema>;
export type TasksResponse = z.infer<typeof TasksResponseSchema>;
export type TaskCommentCreateRequest = z.infer<typeof TaskCommentCreateRequestSchema>;
export type TaskCommentsResponse = z.infer<typeof TaskCommentsResponseSchema>;
export type TasksFindResponse = z.infer<typeof TasksFindResponseSchema>;
export type TaskTemplateCreateRequest = z.infer<typeof TaskTemplateCreateRequestSchema>;
export type TaskTemplatePatchRequest = z.infer<typeof TaskTemplatePatchRequestSchema>;
export type TaskTemplatesFindRequest = z.infer<typeof TaskTemplatesFindRequestSchema>;
export type TaskTemplatesResponse = z.infer<typeof TaskTemplatesResponseSchema>;
export type ApplyTaskTemplateRequest = z.infer<typeof ApplyTaskTemplateRequestSchema>;
