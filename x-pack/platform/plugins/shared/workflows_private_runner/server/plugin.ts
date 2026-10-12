/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { StackConnectorsPluginSetup } from '@kbn/stack-connectors-plugin/server';
import { FleetPrivateLocationRunner } from './fleet_private_location_runner';

export interface WorkflowsPrivateRunnerSetupDeps {
  stackConnectors: StackConnectorsPluginSetup;
}

export interface WorkflowsPrivateRunnerStartDeps {
  fleet: FleetStartContract;
  spaces?: SpacesPluginStart;
}

export class WorkflowsPrivateRunnerPlugin
  implements Plugin<{}, {}, WorkflowsPrivateRunnerSetupDeps, WorkflowsPrivateRunnerStartDeps>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(
    core: CoreSetup<WorkflowsPrivateRunnerStartDeps>,
    { stackConnectors }: WorkflowsPrivateRunnerSetupDeps
  ) {
    stackConnectors.registerPrivateLocationRunner(
      new FleetPrivateLocationRunner({
        logger: this.logger,
        getStartServices: async () => {
          const [coreStart, { fleet, spaces }] = await core.getStartServices();
          return {
            fleet,
            spaces,
            esClient: coreStart.elasticsearch.client.asInternalUser,
          };
        },
      })
    );

    return {};
  }

  start() {
    return {};
  }
}
