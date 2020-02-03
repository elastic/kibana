/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Plugin, CoreSetup, CoreStart, IRouter } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { map, filter, shareReplay, take } from 'rxjs/operators';
import { get } from 'lodash';
import {
  UpgradeAssistantInstruction,
  UpgradeAssistantRecipeEntry,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../plugins/pulse_poc/server/channels/deployment/check_upgrade_assistant';
import { ServerShim, ServerShimWithRouter } from './types';
import { credentialStoreFactory } from './lib/reindexing/credential_store';
import { registerUpgradeAssistantUsageCollector } from './lib/telemetry';
import { registerClusterCheckupRoutes } from './routes/cluster_checkup';
import { registerDeprecationLoggingRoutes } from './routes/deprecation_logging';
import { registerReindexIndicesRoutes, registerReindexWorker } from './routes/reindex_indices';
import { CloudSetup } from '../../../../../plugins/cloud/server';
import { registerTelemetryRoutes } from './routes/telemetry';

interface PluginsSetup {
  __LEGACY: ServerShim;
  usageCollection: UsageCollectionSetup;
  cloud?: CloudSetup;
}

export class UpgradeAssistantServerPlugin implements Plugin {
  setup(
    { http, pulse, elasticsearch }: CoreSetup,
    { __LEGACY, usageCollection, cloud }: PluginsSetup
  ) {
    const router = http.createRouter();
    const shimWithRouter: ServerShimWithRouter = { ...__LEGACY, router };
    registerClusterCheckupRoutes(shimWithRouter, { cloud });
    registerDeprecationLoggingRoutes(shimWithRouter);

    // The ReindexWorker uses a map of request headers that contain the authentication credentials
    // for a given reindex. We cannot currently store these in an the .kibana index b/c we do not
    // want to expose these credentials to any unauthenticated users. We also want to avoid any need
    // to add a user for a special index just for upgrading. This in-memory cache allows us to
    // process jobs without the browser staying on the page, but will require that jobs go into
    // a paused state if no Kibana nodes have the required credentials.
    const credentialStore = credentialStoreFactory();

    const worker = registerReindexWorker(__LEGACY, credentialStore);
    registerReindexIndicesRoutes(shimWithRouter, worker, credentialStore);

    // Bootstrap the needed routes and the collector for the telemetry
    registerTelemetryRoutes(shimWithRouter);
    registerUpgradeAssistantUsageCollector(usageCollection, __LEGACY);

    this.registerInstructionsRoute(router, pulse, elasticsearch);
  }

  start(core: CoreStart, plugins: any) {}

  stop(): void {}

  private registerInstructionsRoute(
    router: IRouter,
    pulse: CoreSetup['pulse'],
    elasticsearch: CoreSetup['elasticsearch']
  ) {
    const instructionSubscription$ = pulse
      .getChannel('deployment')
      .instructions$()
      .pipe(
        map(instructions =>
          instructions.find(
            instruction => !!(instruction as UpgradeAssistantInstruction).upgradeAssistant
          )
        ),
        filter((instruction): instruction is UpgradeAssistantInstruction => Boolean(instruction)),
        shareReplay(1) // Keep the last emitted value in memory
      );

    router.get(
      { path: '/api/upgrade_assistant/guides', validate: false },
      async (context, request, response) => {
        const { upgradeAssistant } = await instructionSubscription$.pipe(take(1)).toPromise();

        for (const [targetVersion, steps] of Object.entries(upgradeAssistant)) {
          const validatedSteps = await Promise.all(
            steps.map(step => this.validateSteps(elasticsearch, step))
          );
          upgradeAssistant[
            targetVersion
          ] = validatedSteps.filter((step): step is UpgradeAssistantRecipeEntry => Boolean(step));
        }

        return response.ok({ body: { upgradeAssistant } });
      }
    );
  }

  private async validateSteps(
    elasticsearch: CoreSetup['elasticsearch'],
    { checks, ...step }: UpgradeAssistantRecipeEntry
  ) {
    if (checks && checks.length > 0) {
      for (const check of checks) {
        const { method, options, path, value } = check;
        const esClient = elasticsearch.adminClient;
        const result = await esClient.callAsInternalUser(method, options);
        const currentValue = path.length ? get(result, path) : result;
        const comparison = Object.entries(value).reduce((acc, [operator, val]) => {
          switch (operator) {
            case 'eq':
              return currentValue === val;
            case 'gt':
              return currentValue > val;
            case 'lt':
              return currentValue < val;
            default:
              return acc;
          }
        }, true);
        if (comparison === false) {
          return undefined;
        }
      }
    }

    if (step.substeps) {
      const validSubsteps = await Promise.all(
        step.substeps.map(substep => this.validateSteps(elasticsearch, substep))
      );
      step.substeps = validSubsteps.filter((s): s is UpgradeAssistantRecipeEntry => Boolean(s));
    }

    return step;
  }
}
