/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';

import { PluginSetupContract as ActionsSetup } from '@kbn/actions-plugin/server';
import { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/server';

import {
  getConnectorType as getSystemLogExampleConnectorType,
  connectorAdapter as systemLogConnectorAdapter,
} from './connector_types/system_log_example';

// this plugin's dependencies
export interface TriggersActionsUiExampleDeps {
  alerting: AlertingSetup;
  actions: ActionsSetup;
}
export class TriggersActionsUiExamplePlugin
  implements Plugin<void, void, TriggersActionsUiExampleDeps>
{
  public setup(core: CoreSetup, { actions, alerting }: TriggersActionsUiExampleDeps) {
    actions.registerType(getSystemLogExampleConnectorType());
    alerting.registerConnectorAdapter(systemLogConnectorAdapter);
  }

  public start() {}
  public stop() {}
}
