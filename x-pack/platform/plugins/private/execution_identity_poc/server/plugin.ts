/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { registerRoutes } from './routes';
import { serviceAccountTokenType, SA_TOKEN_SO_TYPE } from './saved_object';
import type { ExecutionIdentityPocSetupDeps, ExecutionIdentityPocStartDeps } from './types';

export class ExecutionIdentityPocPlugin
  implements Plugin<void, void, ExecutionIdentityPocSetupDeps, ExecutionIdentityPocStartDeps>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<ExecutionIdentityPocStartDeps>,
    plugins: ExecutionIdentityPocSetupDeps
  ): void {
    core.savedObjects.registerType(serviceAccountTokenType);
    plugins.encryptedSavedObjects.registerType({
      type: SA_TOKEN_SO_TYPE,
      attributesToEncrypt: new Set(['token']),
      // Deterministic id keyed off the service account, so run_as can look it up.
      enforceRandomId: false,
    });

    const router = core.http.createRouter();
    registerRoutes(router, this.logger, core.getStartServices);
    this.logger.info('[execution_identity_poc] setup complete');
  }

  public start(_core: CoreStart): void {}

  public stop(): void {}
}
