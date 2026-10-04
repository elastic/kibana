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
import { createGetScreenshots } from './get_screenshots';
import type { PageRenderScreenshottingStart } from './get_screenshots';

export type { PageRenderScreenshottingStart } from './get_screenshots';

interface StartDeps {
  security: SecurityPluginStart;
}

export class PageRenderScreenshottingPlugin
  implements Plugin<void, PageRenderScreenshottingStart, {}, StartDeps>
{
  private readonly logger: Logger;
  private readonly config: PluginConfig;
  /** Latest config, tracked separately from `config` because `kibanaBaseUrl` is declared
   * `dynamicConfig` — `config.get()` is a one-shot read and would never see an override
   * applied through `PUT /internal/core/_settings`. */
  private currentConfig: PluginConfig;
  private configSubscription?: Subscription;

  constructor(context: PluginInitializerContext<PluginConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.currentConfig = this.config;
    this.configSubscription = context.config
      .create<PluginConfig>()
      .subscribe((next) => (this.currentConfig = next));
  }

  public setup(_core: CoreSetup) {
    if (this.config.enabled && !this.config.url) {
      this.logger.warn(
        'xpack.pageRenderScreenshotting.enabled is true but .url is not set — getScreenshots() will reject every call.'
      );
    }
  }

  public start(core: CoreStart, plugins: StartDeps): PageRenderScreenshottingStart {
    // Reporting builds capture URLs from `xpack.reporting.kibanaServer.*`, which defaults to
    // `server.host`/`server.port` — and `create_config.ts` silently rewrites a `0.0.0.0` host to
    // `localhost`. That is correct for the real screenshotting plugin, whose Chromium runs inside
    // the Kibana pod, but a remote render service resolves `localhost` to *itself* and fails with
    // ERR_CONNECTION_REFUSED. So the origin has to be replaced with one the service can reach.
    //
    // Prefer the configured `kibanaBaseUrl` — in serverless that is Kibana's internal URL, which
    // resolves to the ingress proxy's private load balancer and keeps the render request (and the
    // page-load credential it carries) inside the VPC. `server.publicBaseUrl` remains the
    // fallback: it works, but routes out to the public internet and back in.
    const getCaptureBaseUrl = () =>
      this.currentConfig.kibanaBaseUrl ?? core.http.basePath.publicBaseUrl;

    if (this.config.enabled && !getCaptureBaseUrl()) {
      this.logger.warn(
        "Neither xpack.pageRenderScreenshotting.kibanaBaseUrl nor server.publicBaseUrl is set — capture URLs will keep Reporting's default host, which a remote render service cannot reach."
      );
    } else if (this.config.enabled && !this.config.kibanaBaseUrl) {
      this.logger.info(
        'xpack.pageRenderScreenshotting.kibanaBaseUrl is not set — falling back to server.publicBaseUrl, so render requests will reach this Kibana over the public internet rather than in-cluster.'
      );
    }

    if (this.config.enabled && !plugins.security.authc.systemIdentity) {
      this.logger.warn(
        'xpack.security.uiam is not configured — every render request will fail, because page-render-service authenticates the caller against UIAM.'
      );
    }

    return {
      getScreenshots: createGetScreenshots({
        config: this.config,
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
    this.configSubscription = undefined;
  }
}
