/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import { contextRequestSchema } from '@kbn/context-registry-plugin/server/services/context_registry_server';
import { SavedObjectsClient } from '@kbn/core/server';
import type {
  ContextRegistryServerStart,
  ContextRegistryServerSetup,
} from '@kbn/context-registry-plugin/server';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/server';
import { getExampleByServiceName } from './example_context/context_definition';

export interface SetupDependencies {
  contextRegistry: ContextRegistryServerSetup;
  share: SharePluginSetup;
}

export interface StartDependencies {
  contextRegistry: ContextRegistryServerStart;
  share: SharePluginStart;
}

export class ContextRegistryExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(
    { http, getStartServices }: CoreSetup<StartDependencies>,
    dependencies: SetupDependencies
  ) {
    const router = http.createRouter();

    // Example usage of context registry in an api
    router.post(
      {
        path: `/internal/examples/get_example_context`,
        validate: {
          body: contextRequestSchema,
        },
        security: {
          authz: {
            enabled: false,
            reason:
              'Authorization is handled by the individual context handlers, which will check for the appropriate permissions',
          },
        },
      },
      async (_, request, response) => {
        const [, { contextRegistry }] = await getStartServices();

        const results = await contextRegistry.registry.getContextByKey({
          key: 'example',
          context: request.body,
        });

        return response.ok({
          body: {
            data: results,
          },
        });
      }
    );
  }

  public start(coreStart: CoreStart, pluginsStart: StartDependencies) {
    const { contextRegistry } = pluginsStart;

    // example of providing depdencies you may need to your context handler
    const savedObjectsClient = new SavedObjectsClient(
      coreStart.savedObjects.createInternalRepository(['synthetics-monitor'])
    );
    contextRegistry.registry.register(
      getExampleByServiceName({
        savedObjectsClient,
        share: pluginsStart.share,
      })
    );
  }

  public stop() {}
}
