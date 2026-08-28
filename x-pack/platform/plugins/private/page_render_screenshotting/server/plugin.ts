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
    // Reporting builds capture URLs from `xpack.reporting.kibanaServer.*`, which defaults to
    // `server.host`/`server.port` — and `create_config.ts` silently rewrites a `0.0.0.0` host to
    // `localhost`. That is correct for the real screenshotting plugin, whose Chromium runs inside
    // the Kibana pod, but a remote render service resolves `localhost` to *itself* and fails with
    // ERR_CONNECTION_REFUSED. `server.publicBaseUrl` is the only externally-valid origin Kibana
    // knows about (the in-cluster Service is in a per-project namespace the pod cannot discover),
    // so hand it to the client to substitute in.
    const publicBaseUrl = core.http.basePath.publicBaseUrl;
    if (this.config.enabled && !publicBaseUrl) {
      this.logger.warn(
        "server.publicBaseUrl is not set — capture URLs will keep Reporting's default host, which a remote render service cannot reach."
      );
    }

    return {
      getScreenshots: createGetScreenshots({
        config: this.config,
        logger: this.logger,
        security: core.security,
        publicBaseUrl,
      }),
    };
  }

  public stop() {}
}
