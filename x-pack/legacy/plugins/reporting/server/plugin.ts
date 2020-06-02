/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { createBrowserDriverFactory } from './browsers';
import { ReportingConfig } from './config';
import { ReportingCore } from './core';
import { registerRoutes } from './routes';
import { createQueueFactory, enqueueJobFactory, LevelLogger, runValidations } from './lib';
import { setFieldFormats } from './services';
import { ReportingSetup, ReportingSetupDeps, ReportingStart, ReportingStartDeps } from './types';
import { registerReportingUsageCollector } from './usage';
// @ts-ignore no module definition
import { mirrorPluginStatus } from '../../../server/lib/mirror_plugin_status';

export class ReportingPlugin
  implements Plugin<ReportingSetup, ReportingStart, ReportingSetupDeps, ReportingStartDeps> {
  private config: ReportingConfig;
  private logger: LevelLogger;
  private reportingCore: ReportingCore;

  constructor(context: PluginInitializerContext, config: ReportingConfig) {
    this.config = config;
    this.logger = new LevelLogger(context.logger.get('reporting'));
    this.reportingCore = new ReportingCore(this.config);
  }

  public async setup(core: CoreSetup, plugins: ReportingSetupDeps) {
    const { config } = this;
    const { elasticsearch, __LEGACY, licensing, security } = plugins;
    const router = core.http.createRouter();
    const basePath = core.http.basePath.get;
    const { xpack_main: xpackMainLegacy, reporting: reportingLegacy } = __LEGACY.plugins;

    // legacy plugin status
    mirrorPluginStatus(xpackMainLegacy, reportingLegacy);

    const browserDriverFactory = await createBrowserDriverFactory(config, this.logger);
    const deps = {
      browserDriverFactory,
      elasticsearch,
      licensing,
      basePath,
      router,
      security,
    };

    runValidations(config, elasticsearch, browserDriverFactory, this.logger);

    this.reportingCore.pluginSetup(deps);
    registerReportingUsageCollector(this.reportingCore, plugins);
    registerRoutes(this.reportingCore, this.logger);

    return {};
  }

  public async start(core: CoreStart, plugins: ReportingStartDeps) {
    const { reportingCore, logger } = this;

    const esqueue = await createQueueFactory(reportingCore, logger);
    const enqueueJob = enqueueJobFactory(reportingCore, logger);

    this.reportingCore.pluginStart({
      savedObjects: core.savedObjects,
      uiSettings: core.uiSettings,
      esqueue,
      enqueueJob,
    });

    setFieldFormats(plugins.data.fieldFormats);

    return {};
  }

  public getReportingCore() {
    return this.reportingCore;
  }
}
