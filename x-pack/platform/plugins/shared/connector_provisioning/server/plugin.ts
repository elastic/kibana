/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { provisionConnectorFromSecretStepDefinition } from './step_types/provision_connector_from_secret';
import type {
  ConnectorProvisioningPluginSetup,
  ConnectorProvisioningPluginStart,
  ConnectorProvisioningSetupDeps,
  ConnectorProvisioningStartDeps,
} from './types';

export class ConnectorProvisioningPlugin
  implements
    Plugin<
      ConnectorProvisioningPluginSetup,
      ConnectorProvisioningPluginStart,
      ConnectorProvisioningSetupDeps,
      ConnectorProvisioningStartDeps
    >
{
  public setup(
    core: CoreSetup<ConnectorProvisioningStartDeps>,
    plugins: ConnectorProvisioningSetupDeps
  ): ConnectorProvisioningPluginSetup {
    plugins.workflowsExtensions.registerStepDefinition(
      provisionConnectorFromSecretStepDefinition(core)
    );
  }

  public start(_core: CoreStart): ConnectorProvisioningPluginStart {}

  public stop() {}
}
