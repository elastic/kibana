/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { NightshiftSourcesRepositoryClient } from './api';
import { createNightshiftSourcesRepositoryClient } from './api';

export type NightshiftSourcesPublicPluginSetup = Record<string, never>;

export interface NightshiftSourcesPublicPluginStart {
  nightshiftSourcesRepositoryClient: NightshiftSourcesRepositoryClient;
}

export class NightshiftSourcesPublicPlugin
  implements Plugin<NightshiftSourcesPublicPluginSetup, NightshiftSourcesPublicPluginStart>
{
  constructor(_context: PluginInitializerContext) {}

  setup(_core: CoreSetup): NightshiftSourcesPublicPluginSetup {
    return {};
  }

  start(core: CoreStart): NightshiftSourcesPublicPluginStart {
    return {
      nightshiftSourcesRepositoryClient: createNightshiftSourcesRepositoryClient(core),
    };
  }
}
