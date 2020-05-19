/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { createBrowserDriverFactory } from './browsers';
import { ReportingConfig } from './config';
import { ReportingCore } from './core';
import { createQueueFactory, enqueueJobFactory, LevelLogger, runValidations } from './lib';
import { setFieldFormats } from './services';
import { ReportingSetup, ReportingSetupDeps, ReportingStart, ReportingStartDeps } from './types';
import { registerReportingUsageCollector } from './usage';

export class ReportingPlugin
  implements Plugin<ReportingSetup, ReportingStart, ReportingSetupDeps, ReportingStartDeps> {
  private config: ReportingConfig;
  private logger: LevelLogger;
  private reportingCore: ReportingCore;

  constructor(context: PluginInitializerContext, config: ReportingConfig) {
    this.config = config;
    this.logger = new LevelLogger(context.logger.get('reporting'));
    this.reportingCore = new ReportingCore(this.logger, this.config);
  }

  public async setup(core: CoreSetup, plugins: ReportingSetupDeps) {
    const { config } = this;
    const { elasticsearch, __LEGACY } = plugins;

    const browserDriverFactory = await createBrowserDriverFactory(config, this.logger); // required for validations :(
    runValidations(config, elasticsearch, browserDriverFactory, this.logger);

    const { xpack_main: xpackMainLegacy, reporting: reportingLegacy } = __LEGACY.plugins;
    this.reportingCore.legacySetup(xpackMainLegacy, reportingLegacy, __LEGACY, plugins);

    // Register a function with server to manage the collection of usage stats
    registerReportingUsageCollector(this.reportingCore, plugins);

    // regsister setup internals
    this.reportingCore.pluginSetup({ browserDriverFactory, elasticsearch });

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
