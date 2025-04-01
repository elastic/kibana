/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { ProductInterceptPrompter } from './lib/prompter';
import type { ServerConfigSchema } from '../common/config';

export class ProductInterceptPublicPlugin implements Plugin {
  private readonly prompter?: ProductInterceptPrompter;

  constructor(initializerContext: PluginInitializerContext) {
    const { enabled } = initializerContext.config.get<ServerConfigSchema>();

    if (enabled) {
      this.prompter = new ProductInterceptPrompter();
    }
  }

  public setup(core: CoreSetup) {
    this.prompter?.setup({
      analytics: core.analytics,
    });

    return {};
  }

  public start(core: CoreStart) {
    this.prompter?.start({
      http: core.http,
      notifications: core.notifications,
      userProfile: core.userProfile,
      analytics: core.analytics,
    });

    return {};
  }

  public stop() {
    this.prompter?.stop();
  }
}
