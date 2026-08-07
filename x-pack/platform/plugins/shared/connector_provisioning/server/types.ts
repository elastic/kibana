/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';

export interface ConnectorProvisioningSetupDeps {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}

export interface ConnectorProvisioningStartDeps {
  actions: ActionsPluginStart;
}

export type ConnectorProvisioningPluginSetup = void;
export type ConnectorProvisioningPluginStart = void;
