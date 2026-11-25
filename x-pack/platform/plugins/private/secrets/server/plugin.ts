/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import { registerSecretType } from './saved_objects/secret_saved_object';
import type {
  SecretsPluginSetup,
  SecretsPluginSetupDependencies,
  SecretsPluginStart,
} from './types';

export class SecretsPlugin
  implements Plugin<SecretsPluginSetup, SecretsPluginStart, SecretsPluginSetupDependencies>
{
  public setup(
    { savedObjects }: CoreSetup,
    { encryptedSavedObjects }: SecretsPluginSetupDependencies
  ): SecretsPluginSetup {
    registerSecretType({ savedObjects, encryptedSavedObjects });
    return {};
  }

  public start(): SecretsPluginStart {
    return {};
  }

  public stop(): void {}
}
