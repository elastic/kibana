/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { CoreSetup, CoreStart, Plugin, LoggerFactory } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { SecurityPluginSetup } from '../../../../plugins/security/server';
import { XPackMainPlugin } from '../../xpack_main/server/xpack_main';
// @ts-ignore
import { mirrorPluginStatus } from '../../../server/lib/mirror_plugin_status';
import { PLUGIN_ID } from '../common/constants';
import { ReportingPluginSpecOptions } from '../types.d';
import { registerRoutes } from './routes';
import { checkLicenseFactory, getExportTypesRegistry, runValidations, LevelLogger } from './lib';
import { createBrowserDriverFactory } from './browsers';
import { registerReportingUsageCollector } from './usage';
import { logConfiguration } from '../log_configuration';
import { PluginStart as DataPluginStart } from '../../../../../src/plugins/data/server';

export interface ReportingInitializerContext {
  logger: LoggerFactory;
}

// For now there is no exposed functionality to other plugins
export type ReportingSetup = object;
export type ReportingStart = object;

export interface ReportingSetupDeps {
  usageCollection: UsageCollectionSetup;
  security: SecurityPluginSetup;
}
export type ReportingStartDeps = object;

type LegacyPlugins = Legacy.Server['plugins'];

export interface LegacySetup {
  config: Legacy.Server['config'];
  info: Legacy.Server['info'];
  plugins: {
    elasticsearch: LegacyPlugins['elasticsearch'];
    xpack_main: XPackMainPlugin & {
      status?: any;
    };
  };
  route: Legacy.Server['route'];
  savedObjects: Legacy.Server['savedObjects'];
  uiSettingsServiceFactory: Legacy.Server['uiSettingsServiceFactory'];
  fieldFormatServiceFactory: DataPluginStart['fieldFormats']['fieldFormatServiceFactory'];
}

export type ReportingPlugin = Plugin<
  ReportingSetup,
  ReportingStart,
  ReportingSetupDeps,
  ReportingStartDeps
>;

/* We need a factory that returns an instance of the class because the class
 * implementation itself restricts against having Legacy dependencies passed
 * into `setup`. The factory parameters take the legacy dependencies, and the
 * `setup` method gets it from enclosure */
export function reportingPluginFactory(
  initializerContext: ReportingInitializerContext,
  __LEGACY: LegacySetup,
  legacyPlugin: ReportingPluginSpecOptions
) {
  return new (class ReportingPlugin implements ReportingPlugin {
    private initializerContext: ReportingInitializerContext;

    constructor(context: ReportingInitializerContext) {
      this.initializerContext = context;
    }

    public async setup(core: CoreSetup, plugins: ReportingSetupDeps): Promise<ReportingSetup> {
      const exportTypesRegistry = getExportTypesRegistry();

      let isCollectorReady = false;
      // Register a function with server to manage the collection of usage stats
      const { usageCollection } = plugins;
      registerReportingUsageCollector(
        usageCollection,
        __LEGACY,
        () => isCollectorReady,
        exportTypesRegistry
      );

      const logger = new LevelLogger(this.initializerContext.logger.get('reporting'));
      const browserDriverFactory = await createBrowserDriverFactory(__LEGACY, logger);

      logConfiguration(__LEGACY, logger);
      runValidations(__LEGACY, logger, browserDriverFactory);

      const { xpack_main: xpackMainPlugin } = __LEGACY.plugins;
      mirrorPluginStatus(xpackMainPlugin, legacyPlugin);
      const checkLicense = checkLicenseFactory(exportTypesRegistry);
      (xpackMainPlugin as any).status.once('green', () => {
        // Register a function that is called whenever the xpack info changes,
        // to re-compute the license check results for this plugin
        xpackMainPlugin.info.feature(PLUGIN_ID).registerLicenseCheckResultsGenerator(checkLicense);
      });

      // Post initialization of the above code, the collector is now ready to fetch its data
      isCollectorReady = true;

      // Reporting routes
      registerRoutes(__LEGACY, plugins, exportTypesRegistry, browserDriverFactory, logger);

      return {};
    }

    public start(core: CoreStart, plugins: ReportingStartDeps): ReportingStart {
      return {};
    }
  })(initializerContext);
}
