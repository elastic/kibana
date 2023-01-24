/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  Plugin,
  CoreSetup,
  GetDeprecationsContext,
  DeprecationsDetails,
} from '@kbn/core/server';
import { registerRoutes } from './routes';
async function getDeprecations({
  savedObjectsClient,
}: GetDeprecationsContext): Promise<DeprecationsDetails[]> {
  const deprecations: DeprecationsDetails[] = [];
  const { total } = await savedObjectsClient.find({ type: 'test-deprecations-plugin', perPage: 1 });

  deprecations.push({
    title: 'CorePluginDeprecationsPlugin plugin is deprecated',
    message: `CorePluginDeprecationsPlugin is a deprecated feature for testing.`,
    documentationUrl: 'test-url',
    level: 'warning',
    deprecationType: 'feature',
    correctiveActions: {
      manualSteps: ['Step a', 'Step b'],
    },
  });

  if (total > 0) {
    deprecations.push({
      title: 'Detected saved objects in test-deprecations-plugin',
      message: `SavedObject test-deprecations-plugin is still being used.`,
      documentationUrl: 'another-test-url',
      level: 'critical',
      correctiveActions: {
        manualSteps: ['Step a', 'Step b'],
      },
    });
  }

  return deprecations;
}

export class CorePluginDeprecationsPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    registerRoutes(core.http);
    core.savedObjects.registerType({
      name: 'test-deprecations-plugin',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
        },
      },
    });

    core.deprecations.registerDeprecations({ getDeprecations });
  }

  public start() {}
  public stop() {}
}
