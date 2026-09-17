/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin } from '@kbn/core/public';
import type { NightshiftSourcesRepositoryClient } from './api';

export interface NightshiftSourcesPublicPluginStart {
  getClient: () => Promise<NightshiftSourcesRepositoryClient>;
}

export class NightshiftSourcesPublicPlugin
  implements Plugin<void, NightshiftSourcesPublicPluginStart>
{
  setup(): void {}

  start(core: CoreStart): NightshiftSourcesPublicPluginStart {
    let clientPromise: Promise<NightshiftSourcesRepositoryClient> | undefined;
    return {
      getClient: () => {
        if (!clientPromise) {
          clientPromise = import('./api').then(({ createNightshiftSourcesRepositoryClient }) =>
            createNightshiftSourcesRepositoryClient(core)
          );
        }
        return clientPromise;
      },
    };
  }
}
