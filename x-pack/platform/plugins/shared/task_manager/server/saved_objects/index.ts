/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { backgroundTaskNodeMapping, taskMappings, apiKeyToInvalidateMappings } from './mappings';
import { getMigrations } from './migrations';
import { getOldestIdleActionTask } from '../queries/oldest_idle_action_task';
import { TASK_MANAGER_INDEX } from '../constants';
import {
  backgroundTaskNodeModelVersions,
  taskModelVersions,
  apiKeyToInvalidateModelVersions,
} from './model_versions';

export {
  scheduleRruleSchemaV1,
  scheduleRruleSchemaV2,
  scheduleRruleSchemaV3,
} from './schemas/rrule';

export const TASK_SO_NAME = 'task';
export const BACKGROUND_TASK_NODE_SO_NAME = 'background-task-node';
export const INVALIDATE_API_KEY_SO_NAME = 'api_key_to_invalidate';

export function setupSavedObjects(savedObjects: SavedObjectsServiceSetup) {
  savedObjects.registerType({
    name: TASK_SO_NAME,
    namespaceType: 'agnostic',
    hidden: true,
    convertToAliasScript: `ctx._id = ctx._source.type + ':' + ctx._id; ctx._source.remove("kibana")`,
    mappings: taskMappings,
    migrations: getMigrations(),
    indexPattern: TASK_MANAGER_INDEX,
    excludeOnUpgrade: async ({ readonlyEsClient }) => {
      const oldestNeededActionParams = await getOldestIdleActionTask(
        readonlyEsClient,
        TASK_MANAGER_INDEX
      );

      // Delete all action tasks that have failed and are no longer needed
      return {
        bool: {
          must: [
            {
              terms: {
                'task.taskType': [
                  'actions:.email',
                  'actions:.index',
                  'actions:.pagerduty',
                  'actions:.swimlane',
                  'actions:.server-log',
                  'actions:.slack',
                  'actions:.webhook',
                  'actions:.servicenow',
                  'actions:.servicenow-sir',
                  'actions:.jira',
                  'actions:.resilient',
                  'actions:.teams',
                  'actions:.sentinelone',
                ],
              },
            },
            {
              term: { type: 'task' },
            },
            {
              term: { 'task.status': 'failed' },
            },
            {
              range: {
                'task.runAt': {
                  // Only apply to tasks that were run before the oldest needed action
                  lt: oldestNeededActionParams,
                },
              },
            },
          ],
        },
      } as estypes.QueryDslQueryContainer;
    },
    modelVersions: taskModelVersions,
  });

  savedObjects.registerType({
    name: BACKGROUND_TASK_NODE_SO_NAME,
    namespaceType: 'agnostic',
    hidden: true,
    mappings: backgroundTaskNodeMapping,
    indexPattern: TASK_MANAGER_INDEX,
    modelVersions: backgroundTaskNodeModelVersions,
  });

  savedObjects.registerType({
    name: INVALIDATE_API_KEY_SO_NAME,
    namespaceType: 'agnostic',
    hidden: true,
    mappings: apiKeyToInvalidateMappings,
    indexPattern: TASK_MANAGER_INDEX,
    modelVersions: apiKeyToInvalidateModelVersions,
  });
}
