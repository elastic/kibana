/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';

import { PluginSetupContract as ActionsSetup } from '@kbn/actions-plugin/server';
import { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import { DurableFunctionsStartContract } from '@kbn/durable-functions-plugin/server';

import {
  getConnectorType as getSystemLogExampleConnectorType,
  connectorAdapter as systemLogConnectorAdapter,
} from './connector_types/system_log_example';

// this plugin's dependencies
export interface TriggersActionsUiExampleSetupDeps {
  alerting: AlertingServerSetup;
  actions: ActionsSetup;
}

export interface TriggersActionsUiExampleStartDeps {
  durableFunctions: DurableFunctionsStartContract;
}

export class TriggersActionsUiExamplePlugin
  implements Plugin<void, void, TriggersActionsUiExampleSetupDeps, TriggersActionsUiExampleStartDeps>
{
  public setup(core: CoreSetup<TriggersActionsUiExampleStartDeps>, { actions, alerting }: TriggersActionsUiExampleSetupDeps) {
    actions.registerType(getSystemLogExampleConnectorType());
    alerting.registerConnectorAdapter(systemLogConnectorAdapter);

    const router = core.http.createRouter();

    router.get(
      {
        path: '/internal/triggers_actions_ui_example/test',
        validate: {}
      },
      async (context, req, res) => {
        const [_, { durableFunctions }] = await core.getStartServices();
        await durableFunctions.orchestrate('test', async ({ doWork, doWorkAsync }) => {
          const result1 = await doWork({ 
            id: 'work1', 
            executor: () => 'worker1 result'
          });

          const result2 = await doWork({ 
            id: 'work2', 
            executor: () => 'worker2 result'
          });

          const result3 = await doWork({ 
            id: 'work3', 
            executor: async () => {
              await new Promise(r => setTimeout(r, 10000));
              return 'worker3 result';
            }
          });

          const result4 = await doWork({ 
            id: 'work4', 
            executor: () => 'worker4 result'
          });

          const resultAsync1 = await doWorkAsync({
            id: 'workAsync1',
            executor: () => 'workAsync1 result',
          });

          const resultAsync2 = await doWorkAsync({
            id: 'workAsync2',
            executor: () => 'workAsync2 result',
          });

          const resultAsync3 = await doWorkAsync({
            id: 'workAsync3',
            executor: () => 'workAsync3 result',
          });

          const resultAsync4 = await doWorkAsync({
            id: 'workasync4',
            executor: () => 'workasync4 result',
          });
          return [
            result1.result,
            result2.result,
            result3.result,
            result4.result,
            resultAsync1.result,
            resultAsync2.result,
            resultAsync3.result,
            resultAsync4.result,
          ];
        });
        return res.ok();
      }
    )
  }

  public start(core: CoreStart, { durableFunctions }: TriggersActionsUiExampleStartDeps) {}

  public stop() {}
}
