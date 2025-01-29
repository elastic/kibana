/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreSetup, Plugin } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';

import { registerFullStoryRoute } from './routes';

interface CloudFullStorySetupDeps {
  cloud: CloudSetup;
}

export class CloudFullStoryPlugin implements Plugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { cloud }: CloudFullStorySetupDeps) {
    if (cloud.isCloudEnabled) {
      registerFullStoryRoute({
        httpResources: core.http.resources,
        packageInfo: this.initializerContext.env.packageInfo,
      });
    }
  }

  public start() {}

  public stop() {}
}
