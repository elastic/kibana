/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { ProductInterceptPrompter } from './lib/prompter';
import type { ConfigSchema } from '../common/config';

export class ProductInterceptPublicPlugin implements Plugin {
  private readonly config: ConfigSchema;
  private readonly prompter = new ProductInterceptPrompter();

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ConfigSchema>();
  }

  public setup() {
    return {};
  }

  public start(core: CoreStart) {
    if (this.config.enabled) {
      this.prompter.start({
        http: core.http,
        notifications: core.notifications,
        userProfile: core.userProfile,
        analytics: core.analytics,
      });
    }
  }

  public stop() {}
}
