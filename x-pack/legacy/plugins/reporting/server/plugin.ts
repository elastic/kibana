/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { logConfiguration } from '../log_configuration';
import { createBrowserDriverFactory } from './browsers';
import { ReportingCore } from './core';
import { createQueueFactory, enqueueJobFactory, LevelLogger, runValidations } from './lib';
import { setFieldFormats } from './services';
import { ReportingSetup, ReportingSetupDeps, ReportingStart, ReportingStartDeps } from './types';
import { registerReportingUsageCollector } from './usage';

export class ReportingPlugin
  implements Plugin<ReportingSetup, ReportingStart, ReportingSetupDeps, ReportingStartDeps> {
  private logger: LevelLogger;
  private reportingCore: ReportingCore;

  constructor(context: PluginInitializerContext) {
    this.logger = new LevelLogger(context.logger.get('reporting'));
    this.reportingCore = new ReportingCore(this.logger);
  }

  public async setup(core: CoreSetup, plugins: ReportingSetupDeps) {
    const { reporting: reportingNewPlatform, elasticsearch, __LEGACY } = plugins;
    const { config } = reportingNewPlatform;

    const browserDriverFactory = await createBrowserDriverFactory(config, this.logger); // required for validations :(
    runValidations(config, elasticsearch, browserDriverFactory, this.logger); // this must run early, as it sets up config defaults

    const { xpack_main: xpackMainLegacy, reporting: reportingLegacy } = __LEGACY.plugins;
    this.reportingCore.legacySetup(xpackMainLegacy, reportingLegacy, config, __LEGACY, plugins);

    // Register a function with server to manage the collection of usage stats
    registerReportingUsageCollector(this.reportingCore, config, plugins);

    // regsister setup internals
    this.reportingCore.pluginSetup({ browserDriverFactory, config, elasticsearch });

    return {};
  }

  public async start(core: CoreStart, plugins: ReportingStartDeps) {
    const { reportingCore, logger } = this;

    const esqueue = await createQueueFactory(reportingCore, logger);
    const enqueueJob = await enqueueJobFactory(reportingCore, logger);

    this.reportingCore.pluginStart({
      savedObjects: core.savedObjects,
      uiSettings: core.uiSettings,
      esqueue,
      enqueueJob,
    });

    setFieldFormats(plugins.data.fieldFormats);

    const config = await reportingCore.getConfig();
    logConfiguration(config, this.logger);

    return {};
  }

  public getReportingCore() {
    return this.reportingCore;
  }
}
