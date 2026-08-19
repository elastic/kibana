/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import { createConnectorTypeFromSpec } from '@kbn/actions-plugin/server/lib';
import { exampleWebhookSpec } from '../common/connector_spec';
import {
  EXAMPLE_WEBHOOK_CONNECTOR_TYPE_ID,
  EXAMPLE_WEBHOOK_INSTANCE_ID,
  EXAMPLE_WEBHOOK_INSTANCE_NAME,
} from '../common/constants';

export interface WorkflowsConnectorEventsExampleSetupDeps {
  actions: ActionsPluginSetup;
}

export interface WorkflowsConnectorEventsExampleStartDeps {
  actions: ActionsPluginStart;
}

export class WorkflowsConnectorEventsExamplePlugin
  implements
    Plugin<
      void,
      void,
      WorkflowsConnectorEventsExampleSetupDeps,
      WorkflowsConnectorEventsExampleStartDeps
    >
{
  private actionsStart: ActionsPluginStart | undefined;

  public setup(_core: CoreSetup, { actions }: WorkflowsConnectorEventsExampleSetupDeps): void {
    actions.registerType(createConnectorTypeFromSpec(exampleWebhookSpec, actions));
  }

  public start(_core: CoreStart, { actions }: WorkflowsConnectorEventsExampleStartDeps): void {
    this.actionsStart = actions;
    actions.registerDynamicConnector({
      id: EXAMPLE_WEBHOOK_INSTANCE_ID,
      actionTypeId: EXAMPLE_WEBHOOK_CONNECTOR_TYPE_ID,
      name: EXAMPLE_WEBHOOK_INSTANCE_NAME,
      config: {},
      secrets: { authType: 'none' },
      isPreconfigured: true,
      isDeprecated: false,
      isSystemAction: false,
      isConnectorTypeDeprecated: false,
    });
  }

  public stop(): void {
    this.actionsStart?.unregisterDynamicConnector(EXAMPLE_WEBHOOK_INSTANCE_ID);
  }
}
