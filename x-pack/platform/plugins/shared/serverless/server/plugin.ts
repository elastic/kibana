/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';

import { ALL_COMMON_SETTINGS } from '@kbn/serverless-common-settings';
import type {
  ServerlessServerSetup,
  ServerlessServerStart,
  ServerlessServerSetupDependencies,
  ServerlessServerStartDependencies,
} from './types';

export class ServerlessPlugin
  implements
    Plugin<
      ServerlessServerSetup,
      ServerlessServerStart,
      ServerlessServerSetupDependencies,
      ServerlessServerStartDependencies
    >
{
  private projectSettingsAdded: boolean = false;

  private setupProjectSettings(core: CoreSetup, keys: string[]): void {
    const settings = [...ALL_COMMON_SETTINGS].concat(keys);
    core.uiSettings.setAllowlist(settings);
    this.projectSettingsAdded = true;
  }

  constructor() {}

  public setup(core: CoreSetup) {
    return {
      setupProjectSettings: (keys: string[]) => this.setupProjectSettings(core, keys),
    };
  }

  public start(_core: CoreStart) {
    if (!this.projectSettingsAdded) {
      throw new Error(
        "The uiSettings allowlist for serverless hasn't been set up. Make sure to set up your serverless project settings with setupProjectSettings()"
      );
    }
    return {};
  }

  public stop() {}
}
