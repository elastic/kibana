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
import { PLUGIN_ID, setFieldFormats, type ReportingConfigType } from '@kbn/reporting-server';
import { ReportingCore } from '.';
import { registerUiSettings } from './config';
import { registerDeprecations } from './deprecations';
import { ReportingStore } from './lib';
import { registerRoutes } from './routes';
import type {
  ReportingSetup,
  ReportingSetupDeps,
  ReportingStart,
  ReportingStartDeps,
} from './types';
import { ReportingRequestHandlerContext } from './types';
import { registerReportingEventTypes, registerReportingUsageCollector } from './usage';
import { registerFeatures } from './features';

/*
 * @internal
 */
export class ReportingPlugin
  implements Plugin<ReportingSetup, ReportingStart, ReportingSetupDeps, ReportingStartDeps>
{
  private logger: Logger;
  private reportingCore?: ReportingCore;

  constructor(private initContext: PluginInitializerContext<ReportingConfigType>) {
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: ReportingSetupDeps) {
    const { http, status } = core;
    const reportingCore = new ReportingCore(core, this.logger, this.initContext);
    this.reportingCore = reportingCore;

    // prevent throwing errors in route handlers about async deps not being initialized
    // @ts-expect-error null is not assignable to object. use a boolean property to ensure reporting API is enabled.
    http.registerRouteHandlerContext(PLUGIN_ID, () => {
      if (reportingCore.pluginIsStarted()) {
        return reportingCore.getContract();
      } else {
        this.logger.error(`Reporting features are not yet ready`);
        return null;
      }
    });

    // Usage counter for reporting telemetry
    const usageCounter = plugins.usageCollection?.createUsageCounter(PLUGIN_ID);

    reportingCore.pluginSetup({
      logger: this.logger,
      status,
      basePath: http.basePath,
      router: http.createRouter<ReportingRequestHandlerContext>(),
      usageCounter,
      docLinks: core.docLinks,
      ...plugins,
    });

    registerUiSettings(core);
    registerDeprecations({ core });
    registerReportingUsageCollector(reportingCore, plugins.usageCollection);
    registerReportingEventTypes(core);

    // Routes
    registerRoutes(reportingCore, this.logger);

    // async background setup
    (async () => {
      registerFeatures({
        features: plugins.features,
        isServerless: this.initContext.env.packageInfo.buildFlavor === 'serverless',
      });
      this.logger.debug('Setup complete');
    })().catch((e) => {
      this.logger.error(`Error in Reporting setup, reporting may not function properly`);
      this.logger.error(e);
    });

    return reportingCore.getContract();
  }

  public start(core: CoreStart, plugins: ReportingStartDeps) {
    const { elasticsearch, savedObjects, uiSettings } = core;

    // use fieldFormats plugin for csv formats
    setFieldFormats(plugins.fieldFormats);
    const reportingCore = this.reportingCore!;

    // async background start
    (async () => {
      await reportingCore.pluginSetsUp();

      const logger = this.logger;
      const store = new ReportingStore(reportingCore, logger);

      await reportingCore.pluginStart({
        logger,
        esClient: elasticsearch.client,
        analytics: core.analytics,
        savedObjects,
        uiSettings,
        store,
        securityService: core.security,
        ...plugins,
      });

      // Note: this must be called after ReportingCore.pluginStart
      await store.start();

      this.logger.debug('Start complete');
    })().catch((e) => {
      this.logger.error(`Error in Reporting start, reporting may not function properly`);
      this.logger.error(e);
    });

    return reportingCore.getContract();
  }

  stop() {
    this.reportingCore?.pluginStop();
  }
}
