/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnakeToCamelCase } from '../../../common/types';
import type {
  ApplyTaskTemplateUserAction,
  CreateTaskUserAction,
  DeleteTaskUserAction,
  UpdateTaskUserAction,
} from '../../../common/types/domain';
import type { CaseTaskStatus } from '../../../common/types/domain/task/v1';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';
import * as taskI18n from '../tasks/translations';

const STATUS_LABELS: Record<CaseTaskStatus, string> = {
  open: taskI18n.STATUS_OPEN,
  in_progress: taskI18n.STATUS_IN_PROGRESS,
  completed: taskI18n.STATUS_COMPLETED,
  cancelled: taskI18n.STATUS_CANCELLED,
};

const build =
  (label: string, icon: string): UserActionBuilder =>
  ({ userAction, userProfiles, handleOutlineComment }) =>
    createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label,
      icon,
    });

export const createCreateTaskUserActionBuilder: UserActionBuilder = (params) => {
  const { payload } = params.userAction as SnakeToCamelCase<CreateTaskUserAction>;
  return build(i18n.ADDED_TASK(payload.task.title), 'plusCircle')(params);
};

export const createUpdateTaskUserActionBuilder: UserActionBuilder = (params) => {
  const { payload } = params.userAction as SnakeToCamelCase<UpdateTaskUserAction>;
  const statusChange = payload.changedFields.find((change) => change.field === 'status');
  const status = STATUS_LABELS[statusChange?.newValue as CaseTaskStatus];
  return build(
    status
      ? i18n.CHANGED_TASK_STATUS(payload.taskTitle, status.toLowerCase())
      : i18n.UPDATED_TASK(payload.taskTitle),
    'dot'
  )(params);
};

export const createDeleteTaskUserActionBuilder: UserActionBuilder = (params) => {
  const { payload } = params.userAction as SnakeToCamelCase<DeleteTaskUserAction>;
  return build(i18n.DELETED_TASK(payload.taskTitle), 'trash')(params);
};

export const createApplyTaskTemplateUserActionBuilder: UserActionBuilder = (params) => {
  const { payload } = params.userAction as SnakeToCamelCase<ApplyTaskTemplateUserAction>;
  return build(
    i18n.APPLIED_TASK_LIST(payload.templateName, payload.tasksCreated),
    'documents'
  )(params);
};
