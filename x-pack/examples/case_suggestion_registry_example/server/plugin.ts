/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import { caseSuggestionRequestSchema } from '@kbn/case-suggestion-registry-plugin/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type {
  CaseSuggestionRegistryServerStart,
  CaseSuggestionRegistryServerSetup,
} from '@kbn/case-suggestion-registry-plugin/server';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/server';
import { getExampleByServiceName } from './example_suggestion/case_suggestion_definition';

export interface SetupDependencies {
  caseSuggestionRegistry: CaseSuggestionRegistryServerSetup;
  share: SharePluginSetup;
}

export interface StartDependencies {
  caseSuggestionRegistry: CaseSuggestionRegistryServerStart;
  share: SharePluginStart;
}

export class CaseSuggestionRegistryExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(
    { http, getStartServices }: CoreSetup<StartDependencies>,
    dependencies: SetupDependencies
  ) {
    const router = http.createRouter();

    // Example usage of case suggestion registry in an api
    router.post(
      {
        path: `/internal/examples/get_example_suggestion`,
        validate: {
          body: caseSuggestionRequestSchema,
        },
        security: {
          authz: {
            enabled: false,
            reason:
              'Authorization is handled by the individual suggestion handlers, which will check for the appropriate permissions',
          },
        },
      },
      async (_, request, response) => {
        const [, { caseSuggestionRegistry }] = await getStartServices();

        const results = await caseSuggestionRegistry.registry.getCaseSuggestionByKey({
          key: 'example',
          context: request.body as {
            'service.name'?: string;
            timeRange?: { from: string; to: string };
          },
          owner: 'observability',
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
    const { caseSuggestionRegistry } = pluginsStart;

    // example of providing depdencies you may need to your suggestion handler
    const savedObjectsClient = new SavedObjectsClient(
      coreStart.savedObjects.createInternalRepository(['synthetics-monitor'])
    );
    caseSuggestionRegistry.registry.register(
      getExampleByServiceName({
        savedObjectsClient,
        share: pluginsStart.share,
      })
    );
  }

  public stop() {}
}
