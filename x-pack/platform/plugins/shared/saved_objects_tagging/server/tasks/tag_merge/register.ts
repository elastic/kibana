/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { TaskCost, type TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { TAG_MERGE_TASK_TYPE } from './constants';
import { tagMergeTaskParamsSchema, tagMergeTaskStateSchemaByVersion } from './schemas';
import { createTagMergeTaskRunner } from './task_runner';

export const registerTagMergeTaskType = ({
  taskManager,
  getStartServices,
}: {
  taskManager: TaskManagerSetupContract;
  getStartServices: () => Promise<[CoreStart, unknown, unknown]>;
}) => {
  taskManager.registerTaskDefinitions({
    [TAG_MERGE_TASK_TYPE]: {
      title: 'Merge duplicate tags',
      description:
        "Rewrites saved object references from one or more duplicate tags to a canonical tag, optionally deleting the sources once they're unreferenced.",
      timeout: '2m',
      cost: TaskCost.Normal,
      paramsSchema: tagMergeTaskParamsSchema,
      stateSchemaByVersion: tagMergeTaskStateSchemaByVersion,
      createTaskRunner: createTagMergeTaskRunner(() => getStartServices().then(([core]) => core)),
    },
  });
};
