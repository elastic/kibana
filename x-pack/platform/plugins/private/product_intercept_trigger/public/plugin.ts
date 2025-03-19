/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Plugin } from '@kbn/core/public';
import { ProductInterceptPrompter } from './lib/prompter';

export class ProductInterceptPublicPlugin implements Plugin {
  private readonly prompter = new ProductInterceptPrompter();

  public setup() {
    return {};
  }

  public start(core: CoreStart) {
    this.prompter.start({
      http: core.http,
      notifications: core.notifications,
      userProfile: core.userProfile,
      analytics: core.analytics,
    });
  }

  public stop() {}
}
