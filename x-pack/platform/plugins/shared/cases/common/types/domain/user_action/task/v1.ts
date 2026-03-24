/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserActionTypes } from '../action/v1';

// --- create_task ---

const CreateTaskPayloadTaskRt = rt.strict({
  id: rt.string,
  title: rt.string,
  status: rt.string,
  priority: rt.string,
  assignees: rt.array(rt.strict({ uid: rt.string })),
});

export const CreateTaskUserActionPayloadRt = rt.strict({
  task: CreateTaskPayloadTaskRt,
});

export const CreateTaskUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.create_task),
  payload: CreateTaskUserActionPayloadRt,
});

// --- update_task ---

export const UpdateTaskChangedFieldRt = rt.strict({
  field: rt.string,
  old_value: rt.unknown,
  new_value: rt.unknown,
});

export const UpdateTaskUserActionPayloadRt = rt.strict({
  task_id: rt.string,
  task_title: rt.string,
  changed_fields: rt.array(UpdateTaskChangedFieldRt),
});

export const UpdateTaskUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.update_task),
  payload: UpdateTaskUserActionPayloadRt,
});

// --- delete_task ---

export const DeleteTaskUserActionPayloadRt = rt.strict({
  task_id: rt.string,
  task_title: rt.string,
  subtasks_deleted: rt.number,
});

export const DeleteTaskUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.delete_task),
  payload: DeleteTaskUserActionPayloadRt,
});

// --- apply_task_template ---

export const ApplyTaskTemplateUserActionPayloadRt = rt.strict({
  template_id: rt.string,
  template_name: rt.string,
  tasks_created: rt.number,
});

export const ApplyTaskTemplateUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.apply_task_template),
  payload: ApplyTaskTemplateUserActionPayloadRt,
});

export type CreateTaskUserActionPayload = rt.TypeOf<typeof CreateTaskUserActionPayloadRt>;
export type CreateTaskUserAction = rt.TypeOf<typeof CreateTaskUserActionRt>;
export type UpdateTaskChangedField = rt.TypeOf<typeof UpdateTaskChangedFieldRt>;
export type UpdateTaskUserActionPayload = rt.TypeOf<typeof UpdateTaskUserActionPayloadRt>;
export type UpdateTaskUserAction = rt.TypeOf<typeof UpdateTaskUserActionRt>;
export type DeleteTaskUserActionPayload = rt.TypeOf<typeof DeleteTaskUserActionPayloadRt>;
export type DeleteTaskUserAction = rt.TypeOf<typeof DeleteTaskUserActionRt>;
export type ApplyTaskTemplateUserActionPayload = rt.TypeOf<
  typeof ApplyTaskTemplateUserActionPayloadRt
>;
export type ApplyTaskTemplateUserAction = rt.TypeOf<typeof ApplyTaskTemplateUserActionRt>;
