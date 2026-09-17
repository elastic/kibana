/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin } from '@kbn/core/public';
import type { NightshiftSourcesRepositoryClient } from './api';
import { createNightshiftSourcesRepositoryClient } from './api';

export interface NightshiftSourcesPublicPluginStart {
  nightshiftSourcesRepositoryClient: NightshiftSourcesRepositoryClient;
}

export class NightshiftSourcesPublicPlugin
  implements Plugin<void, NightshiftSourcesPublicPluginStart>
{
  setup(): void {}

  start(core: CoreStart): NightshiftSourcesPublicPluginStart {
    return {
      nightshiftSourcesRepositoryClient: createNightshiftSourcesRepositoryClient(core),
    };
  }
}
