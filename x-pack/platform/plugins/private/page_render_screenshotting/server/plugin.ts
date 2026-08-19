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
import type { PluginConfig } from './config';
import { createGetScreenshots } from './get_screenshots';
import type { PageRenderScreenshottingStart } from './get_screenshots';

export type { PageRenderScreenshottingStart } from './get_screenshots';

export class PageRenderScreenshottingPlugin implements Plugin<void, PageRenderScreenshottingStart> {
  private readonly logger: Logger;
  private readonly config: PluginConfig;

  constructor(context: PluginInitializerContext<PluginConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  public setup(_core: CoreSetup) {
    if (this.config.enabled && !this.config.url) {
      this.logger.warn(
        'xpack.pageRenderScreenshotting.enabled is true but .url is not set — getScreenshots() will reject every call.'
      );
    }
  }

  public start(core: CoreStart): PageRenderScreenshottingStart {
    return {
      getScreenshots: createGetScreenshots({
        config: this.config,
        logger: this.logger,
        security: core.security,
      }),
    };
  }

  public stop() {}
}
