/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import { MAX_TASKS_PER_CASE } from '../../../common/constants';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import type { CaseTaskTemplate } from '../../../common/types/domain/task_template/v1';
import { UserActionTypes } from '../../../common/types/domain/user_action/action/v1';
import type { CaseUserActionService } from '../../services';
import type { CaseTaskService } from '../../services/tasks';
import type { CaseTaskTemplateService } from '../../services/task_templates';
import type { TaskInput } from '../../services/tasks/types';
import type { User } from '../../common/types/user';

const dueDateFrom = (relativeDays: number | null, anchor: Date): string | null => {
  if (relativeDays === null) {
    return null;
  }
  const due = new Date(anchor);
  due.setDate(due.getDate() + relativeDays);
  return due.toISOString();
};

const toInput = (
  entry: {
    title: string;
    description: string;
    priority: TaskInput['priority'];
    relative_due_days: number | null;
  },
  templateId: string,
  anchor: Date
): TaskInput => ({
  title: entry.title,
  description: entry.description,
  priority: entry.priority,
  due_date: dueDateFrom(entry.relative_due_days, anchor),
  template_id: templateId,
});

export const ensureTaskCapacity = async (
  taskService: CaseTaskService,
  caseId: string,
  adding: number
) => {
  const { total } = await taskService.findTasks({ caseIds: [caseId], perPage: 1 });
  if (total + adding > MAX_TASKS_PER_CASE) {
    throw Boom.badRequest(`A case can have at most ${MAX_TASKS_PER_CASE} tasks`);
  }
};

/**
 * Creates every task of a task list on a case (roots first, then sub-tasks) and records the
 * user action. Authorization is the caller's responsibility.
 */
export const applyTaskListToCase = async ({
  caseId,
  owner,
  template,
  user,
  taskService,
  userActionService,
}: {
  caseId: string;
  owner: string;
  template: CaseTaskTemplate;
  user: User;
  taskService: CaseTaskService;
  userActionService: CaseUserActionService;
}): Promise<CaseTask[]> => {
  const anchor = new Date();
  await ensureTaskCapacity(
    taskService,
    caseId,
    template.tasks.reduce((count, task) => count + 1 + task.subtasks.length, 0)
  );

  const roots = await taskService.bulkCreateTasks({
    caseId,
    owner,
    user,
    tasks: template.tasks.map((task) => toInput(task, template.id, anchor)),
  });
  const children = await taskService.bulkCreateTasks({
    caseId,
    owner,
    user,
    refresh: 'wait_for',
    tasks: template.tasks.flatMap((task, index) =>
      task.subtasks.map((sub) => ({
        ...toInput(sub, template.id, anchor),
        parent_task_id: roots[index].id,
      }))
    ),
  });
  const tasks = [...roots, ...children];

  await userActionService.creator.createUserAction({
    userAction: {
      type: UserActionTypes.apply_task_template,
      caseId,
      owner,
      user,
      payload: {
        template_id: template.id,
        template_name: template.name,
        tasks_created: tasks.length,
      },
    },
  });

  return tasks;
};

/**
 * Adds the task lists a template references to a freshly created case. A failing or foreign
 * task list is logged and skipped: like template assignees, a template default must not fail
 * case creation.
 */
export const seedTaskListsFromTemplate = async ({
  caseId,
  owner,
  taskListIds,
  user,
  logger,
  taskService,
  taskTemplateService,
  userActionService,
}: {
  caseId: string;
  owner: string;
  taskListIds: string[];
  user: User;
  logger: Logger;
  taskService: CaseTaskService;
  taskTemplateService: CaseTaskTemplateService;
  userActionService: CaseUserActionService;
}): Promise<void> => {
  for (const templateId of taskListIds) {
    try {
      const template = await taskTemplateService.getTemplate(templateId);
      if (template.owner !== owner) {
        throw new Error(`task list belongs to ${template.owner}`);
      }
      await applyTaskListToCase({ caseId, owner, template, user, taskService, userActionService });
    } catch (error) {
      logger.warn(`Failed to add task list ${templateId} to case ${caseId}: ${error}`);
    }
  }
};
