/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { SnakeToCamelCase } from '../../../common/types';
import type {
  CreateTaskUserAction,
  UpdateTaskUserAction,
  DeleteTaskUserAction,
  ApplyTaskTemplateUserAction,
} from '../../../common/types/domain';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';

export const createCreateTaskUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const action = userAction as SnakeToCamelCase<CreateTaskUserAction>;
    const taskTitle = action?.payload?.task?.title ?? '';

    const label = (
      <EuiText size="s" data-test-subj="create-task-user-action">
        {i18n.CREATED_TASK(taskTitle)}
      </EuiText>
    );

    const commonBuilder = createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label,
      icon: 'checkInCircleFilled',
    });

    return commonBuilder.build();
  },
});

export const createUpdateTaskUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const action = userAction as SnakeToCamelCase<UpdateTaskUserAction>;
    const taskTitle = action?.payload?.taskTitle ?? '';

    const label = (
      <EuiText size="s" data-test-subj="update-task-user-action">
        {i18n.UPDATED_TASK(taskTitle)}
      </EuiText>
    );

    const commonBuilder = createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return commonBuilder.build();
  },
});

export const createDeleteTaskUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const action = userAction as SnakeToCamelCase<DeleteTaskUserAction>;
    const taskTitle = action?.payload?.taskTitle ?? '';

    const label = (
      <EuiText size="s" data-test-subj="delete-task-user-action">
        {i18n.DELETED_TASK(taskTitle)}
      </EuiText>
    );

    const commonBuilder = createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label,
      icon: 'minusInCircle',
    });

    return commonBuilder.build();
  },
});

export const createApplyTaskTemplateUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const action = userAction as SnakeToCamelCase<ApplyTaskTemplateUserAction>;
    const tasksCreated = action?.payload?.tasksCreated ?? 0;

    const label = (
      <EuiText size="s" data-test-subj="apply-task-template-user-action">
        {i18n.APPLIED_TASK_TEMPLATE(tasksCreated)}
      </EuiText>
    );

    const commonBuilder = createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label,
      icon: 'checkInCircleFilled',
    });

    return commonBuilder.build();
  },
});
