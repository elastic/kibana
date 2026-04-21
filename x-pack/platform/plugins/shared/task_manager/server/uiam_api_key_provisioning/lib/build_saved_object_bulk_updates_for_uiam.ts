/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsBulkUpdateObject } from '@kbn/core/server';
import { TASK_SO_NAME } from '../../saved_objects';
import type { ConcreteTaskInstance, TaskUserScope } from '../../task';
import type { UiamKeyResult } from '../types';

export const buildSavedObjectBulkUpdatesForUiamKeys = (
  converted: UiamKeyResult[],
  tasksById: Map<string, ConcreteTaskInstance>
): Array<SavedObjectsBulkUpdateObject<{ uiamApiKey: string; userScope: TaskUserScope }>> =>
  converted.map((c) => {
    const task = tasksById.get(c.taskId);
    const existingUserScope: TaskUserScope = task?.userScope ?? {
      apiKeyId: '',
      apiKeyCreatedByUser: false,
    };
    const mergedUserScope: TaskUserScope = {
      ...existingUserScope,
      uiamApiKeyId: c.uiamApiKeyId,
    };
    return {
      type: TASK_SO_NAME,
      id: c.taskId,
      attributes: {
        uiamApiKey: c.uiamApiKey,
        userScope: mergedUserScope,
      },
      ...(task?.version ? { version: task.version } : {}),
      mergeAttributes: true,
    };
  });
