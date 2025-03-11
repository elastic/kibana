/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, FakeRawRequest } from '@kbn/core/server';

import { PluginSetupContract as ActionsSetup } from '@kbn/actions-plugin/server';
import { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { schema } from '@kbn/config-schema';
import {
  getConnectorType as getSystemLogExampleConnectorType,
  connectorAdapter as systemLogConnectorAdapter,
} from './connector_types/system_log_example';

// this plugin's dependencies
export interface TriggersActionsUiExampleSetupDeps {
  alerting: AlertingServerSetup;
  actions: ActionsSetup;
  taskManager: TaskManagerSetupContract;
}

export interface TriggersActionsUiStartDeps {
  taskManager: TaskManagerStartContract;
}

export class TriggersActionsUiExamplePlugin
  implements Plugin<void, void, TriggersActionsUiExampleSetupDeps, TriggersActionsUiStartDeps>
{
  public setup(
    core: CoreSetup<TriggersActionsUiStartDeps>,
    { actions, alerting, taskManager }: TriggersActionsUiExampleSetupDeps
  ) {
    actions.registerType(getSystemLogExampleConnectorType());
    alerting.registerConnectorAdapter(systemLogConnectorAdapter);

    const router = core.http.createRouter();

    router.post(
      {
        path: '/api/triggers_actions_ui_example/schedule_task_with_api_key/{id}',
        validate: {
          params: schema.object({
            id: schema.string(),
          }),
        },
      },
      async (context, request, res) => {
        const { taskManager: taskManagerStart } = (await core.getStartServices())[1];
        const id = request.params.id;
        await taskManagerStart.schedule(
          {
            id,
            taskType: 'taskWithApiKey',
            params: {},
            state: {},
            schedule: {
              interval: '30s',
            },
            enabled: true,
          },
          {
            request,
          }
        );
        return res.ok();
      }
    );

    router.post(
      {
        path: '/api/triggers_actions_ui_example/remove_task_with_api_key/{id}',
        validate: {
          params: schema.object({
            id: schema.string(),
          }),
        },
      },
      async (context, request, res) => {
        const { taskManager: taskManagerStart } = (await core.getStartServices())[1];
        const id = request.params.id;

        try {
          await taskManagerStart.remove(id);
          // eslint-disable-next-line no-empty
        } catch (e) {}

        return res.ok();
      }
    );

    router.post(
      {
        path: '/api/triggers_actions_ui_example/bulk_remove_task_with_api_key',
        validate: {
          body: schema.object({
            ids: schema.arrayOf(schema.string()),
          }),
        },
      },
      async (context, request, res) => {
        const { taskManager: taskManagerStart } = (await core.getStartServices())[1];
        const ids = request.body.ids;

        try {
          await taskManagerStart.bulkRemove(ids);
          // eslint-disable-next-line no-empty
        } catch (e) {}

        return res.ok();
      }
    );

    taskManager.registerTaskDefinitions({
      taskWithApiKey: {
        title: 'taskWithApiKey',
        createTaskRunner: ({ taskInstance }) => ({
          run: async () => {
            const services = await core.getStartServices();
            const fakeRawRequest: FakeRawRequest = {
              headers: {
                authorization: `ApiKey ${taskInstance?.apiKey}`,
              },
              path: '/',
            };

            const path = addSpaceIdToPath('/', taskInstance.userScope?.spaceId || 'default');

            // Fake request from the API key
            const fakeRequest = kibanaRequestFactory(fakeRawRequest);
            services[0].http.basePath.set(fakeRequest, path);

            // Getting access to scoped clients using the API key
            // const savedObjectsClient = services[0].savedObjects.getScopedClient(fakeRequest, {
            //   includedHiddenTypes: ['task'],
            // });

            // const savedObjectsRepositoryClient = services[0].savedObjects.createInternalRepository([
            //   'task',
            // ]);

            // const task = await savedObjectsClient.get('task', taskInstance.id);
            // const encryptedTask = await savedObjectsRepositoryClient.get('task', taskInstance.id);

            // console.log(
            //   'Fetched task with decrypted scoped API key',
            //   JSON.stringify(taskInstance, null, 2)
            // );
            // console.log(
            //   'Fetched task with missing scoped API key',
            //   JSON.stringify(task.attributes, null, 2)
            // );
            // console.log(
            //   'Fetched task with encrypted scoped API key',
            //   JSON.stringify(encryptedTask.attributes, null, 2)
            // );

            return {
              state: {},
            };
          },
          cancel: async () => {},
        }),
      },
    });
  }

  public start() {}
  public stop() {}
}
