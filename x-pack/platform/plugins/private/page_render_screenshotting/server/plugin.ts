/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { PluginConfig } from './config';
import { createDispatcherProvider } from './render/dispatcher';
import { createGetScreenshots, diagnose } from './get_screenshots';
import type { PageRenderScreenshottingStart } from './get_screenshots';

export type { PageRenderScreenshottingStart } from './get_screenshots';

interface StartDeps {
  security: SecurityPluginStart;
}

export class PageRenderScreenshottingPlugin
  implements Plugin<void, PageRenderScreenshottingStart, {}, StartDeps>
{
  private readonly logger: Logger;
  /** Kept current so dynamic overrides of `kibanaBaseUrl` take effect without a restart. */
  private config: PluginConfig;
  private configSubscription?: Subscription;

  constructor(private readonly context: PluginInitializerContext<PluginConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  public setup(_core: CoreSetup) {
    this.configSubscription = this.context.config
      .create<PluginConfig>()
      .subscribe((next) => (this.config = next));

    if (this.config.enabled && !this.config.url) {
      this.logger.warn(
        'xpack.pageRenderScreenshotting.url is not set; every render request will fail.'
      );
    }
  }

  public start(core: CoreStart, plugins: StartDeps): PageRenderScreenshottingStart {
    const getCaptureBaseUrl = () => this.config.kibanaBaseUrl ?? core.http.basePath.publicBaseUrl;

    if (this.config.enabled) {
      if (!getCaptureBaseUrl()) {
        this.logger.warn(
          'Neither xpack.pageRenderScreenshotting.kibanaBaseUrl nor server.publicBaseUrl is set; the render service will not be able to reach Kibana.'
        );
      }
      if (!plugins.security.authc.systemIdentity) {
        this.logger.warn(
          'xpack.security.uiam is not configured; every render request will fail to authenticate.'
        );
      }
    }

    return {
      diagnose,
      getScreenshots: createGetScreenshots({
        getServiceUrl: () => this.config.url,
        logger: this.logger,
        security: core.security,
        getCaptureBaseUrl,
        getSystemIdentity: () => plugins.security.authc.systemIdentity,
        getDispatcher: createDispatcherProvider(this.config.ssl),
      }),
    };
  }

  public stop() {
    this.configSubscription?.unsubscribe();
  }
}
