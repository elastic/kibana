/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';

import type { IngestHubServerSetupDeps, IngestHubServerStartDeps } from './types';

export class IngestHubPlugin
  implements Plugin<void, void, IngestHubServerSetupDeps, IngestHubServerStartDeps>
{
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup<IngestHubServerStartDeps, void>): void {}

  public start(_core: CoreStart, plugins: IngestHubServerStartDeps): void {}

  public stop(): void {}
}
