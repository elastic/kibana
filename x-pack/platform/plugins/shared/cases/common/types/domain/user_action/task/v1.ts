/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';

// --- create_task ---

const CreateTaskPayloadTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  priority: z.string(),
  assignees: z.array(z.object({ uid: z.string() })),
});

export const CreateTaskUserActionPayloadSchema = z.object({
  task: CreateTaskPayloadTaskSchema,
});

export const CreateTaskUserActionSchema = z.object({
  type: z.literal(UserActionTypes.create_task),
  payload: CreateTaskUserActionPayloadSchema,
});

// --- update_task ---

export const UpdateTaskChangedFieldSchema = z.object({
  field: z.string(),
  old_value: z.unknown(),
  new_value: z.unknown(),
});

export const UpdateTaskUserActionPayloadSchema = z.object({
  task_id: z.string(),
  task_title: z.string(),
  changed_fields: z.array(UpdateTaskChangedFieldSchema),
});

export const UpdateTaskUserActionSchema = z.object({
  type: z.literal(UserActionTypes.update_task),
  payload: UpdateTaskUserActionPayloadSchema,
});

// --- delete_task ---

export const DeleteTaskUserActionPayloadSchema = z.object({
  task_id: z.string(),
  task_title: z.string(),
  subtasks_deleted: z.number(),
});

export const DeleteTaskUserActionSchema = z.object({
  type: z.literal(UserActionTypes.delete_task),
  payload: DeleteTaskUserActionPayloadSchema,
});

// --- apply_task_template ---

export const ApplyTaskTemplateUserActionPayloadSchema = z.object({
  template_id: z.string(),
  template_name: z.string(),
  tasks_created: z.number(),
});

export const ApplyTaskTemplateUserActionSchema = z.object({
  type: z.literal(UserActionTypes.apply_task_template),
  payload: ApplyTaskTemplateUserActionPayloadSchema,
});

export type CreateTaskUserActionPayload = z.infer<typeof CreateTaskUserActionPayloadSchema>;
export type CreateTaskUserAction = z.infer<typeof CreateTaskUserActionSchema>;
export type UpdateTaskChangedField = z.infer<typeof UpdateTaskChangedFieldSchema>;
export type UpdateTaskUserActionPayload = z.infer<typeof UpdateTaskUserActionPayloadSchema>;
export type UpdateTaskUserAction = z.infer<typeof UpdateTaskUserActionSchema>;
export type DeleteTaskUserActionPayload = z.infer<typeof DeleteTaskUserActionPayloadSchema>;
export type DeleteTaskUserAction = z.infer<typeof DeleteTaskUserActionSchema>;
export type ApplyTaskTemplateUserActionPayload = z.infer<
  typeof ApplyTaskTemplateUserActionPayloadSchema
>;
export type ApplyTaskTemplateUserAction = z.infer<typeof ApplyTaskTemplateUserActionSchema>;
