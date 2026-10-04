/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
// Four thin builders share one base; the factory needs a distinct class per user action type.

import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import type { UserActionAction } from '../../../../common/types/domain';
import { UserActionActions, UserActionTypes } from '../../../../common/types/domain';
import { UserActionBuilder } from '../abstract_builder';
import type { BuilderParameters, UserActionEvent, UserActionParameters } from '../types';

type TaskUserActionType = 'create_task' | 'update_task' | 'delete_task' | 'apply_task_template';

const ACTIONS: Record<TaskUserActionType, UserActionAction> = {
  create_task: UserActionActions.create,
  update_task: UserActionActions.update,
  delete_task: UserActionActions.delete,
  apply_task_template: UserActionActions.create,
};

/** Task user actions store their whole payload; the case is the only reference. */
abstract class TaskUserActionBuilder<T extends TaskUserActionType> extends UserActionBuilder {
  protected abstract readonly type: T;
  protected abstract describe(payload: BuilderParameters[T]['parameters']['payload']): string;

  build(args: UserActionParameters<T>): UserActionEvent {
    const action = ACTIONS[this.type];
    return {
      parameters: {
        attributes: {
          ...this.getCommonUserActionAttributes(args),
          action,
          payload: args.payload,
          type: UserActionTypes[this.type],
        },
        references: this.createCaseReferences(args.caseId),
      },
      eventDetails: {
        getMessage: (id?: string) =>
          `User ${this.describe(args.payload)} for case id: ${args.caseId} - user action id: ${id}`,
        action,
        descriptiveAction: `case_user_action_${this.type}`,
        savedObjectId: args.caseId,
        savedObjectType: CASE_SAVED_OBJECT,
      },
    };
  }
}

export class CreateTaskUserActionBuilder extends TaskUserActionBuilder<'create_task'> {
  protected readonly type = 'create_task' as const;
  protected describe({ task }: BuilderParameters['create_task']['parameters']['payload']) {
    return `added task ${task.id}`;
  }
}

export class UpdateTaskUserActionBuilder extends TaskUserActionBuilder<'update_task'> {
  protected readonly type = 'update_task' as const;
  protected describe({
    task_id: taskId,
  }: BuilderParameters['update_task']['parameters']['payload']) {
    return `updated task ${taskId}`;
  }
}

export class DeleteTaskUserActionBuilder extends TaskUserActionBuilder<'delete_task'> {
  protected readonly type = 'delete_task' as const;
  protected describe({
    task_id: taskId,
  }: BuilderParameters['delete_task']['parameters']['payload']) {
    return `deleted task ${taskId}`;
  }
}

export class ApplyTaskTemplateUserActionBuilder extends TaskUserActionBuilder<'apply_task_template'> {
  protected readonly type = 'apply_task_template' as const;
  protected describe({
    template_id: templateId,
  }: BuilderParameters['apply_task_template']['parameters']['payload']) {
    return `applied task list ${templateId}`;
  }
}
