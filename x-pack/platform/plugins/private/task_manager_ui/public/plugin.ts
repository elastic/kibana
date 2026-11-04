/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import { BACKGROUND_TASKS_APP_ID, BACKGROUND_TASKS_TITLE } from './constants';

export interface TaskManagerUiSetupDeps {
  management: ManagementSetup;
}

export type TaskManagerUiSetup = Record<string, never>;
export type TaskManagerUiStart = Record<string, never>;

/**
 * Registers the "Background tasks" page under Stack Management: a read-only view of the task
 * index, grouped into parent / sub-task trees, for superusers.
 */
export class TaskManagerUiPlugin
  implements Plugin<TaskManagerUiSetup, TaskManagerUiStart, TaskManagerUiSetupDeps>
{
  public setup(core: CoreSetup, { management }: TaskManagerUiSetupDeps): TaskManagerUiSetup {
    management.sections.section.stack.registerApp({
      id: BACKGROUND_TASKS_APP_ID,
      title: BACKGROUND_TASKS_TITLE,
      order: 7,
      keywords: ['task', 'tasks', 'task manager', 'background', 'sub-task', 'fan-out'],
      mount: async (params) => {
        const { mountManagementSection } = await import('./application/mount');
        return mountManagementSection({ core, params });
      },
    });
    return {};
  }

  public start(): TaskManagerUiStart {
    return {};
  }

  public stop() {}
}
