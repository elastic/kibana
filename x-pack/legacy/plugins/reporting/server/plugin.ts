/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import {
  CoreSetup,
  CoreStart,
  ElasticsearchServiceSetup,
  Plugin,
  PluginInitializerContext,
} from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { PluginStart as DataPluginStart } from '../../../../../src/plugins/data/server';
import { SecurityPluginSetup } from '../../../../plugins/security/server';
// @ts-ignore
import { mirrorPluginStatus } from '../../../server/lib/mirror_plugin_status';
import { XPackMainPlugin } from '../../xpack_main/server/xpack_main';
import { PLUGIN_ID } from '../common/constants';
import { logConfiguration } from '../log_configuration';
import { ReportingPluginSpecOptions } from '../types.d';
import { createBrowserDriverFactory } from './browsers';
import { checkLicenseFactory, getExportTypesRegistry, LevelLogger, runValidations } from './lib';
import { registerRoutes } from './routes';
import { setFieldFormats } from './services';
import { registerReportingUsageCollector } from './usage';

export interface ReportingSetupDeps {
  elasticsearch: ElasticsearchServiceSetup;
  usageCollection: UsageCollectionSetup;
  security: SecurityPluginSetup;
  __LEGACY: LegacySetup;
}

export interface ReportingStartDeps {
  data: DataPluginStart;
}

export interface LegacySetup {
  config: Legacy.Server['config'];
  info: Legacy.Server['info'];
  plugins: {
    elasticsearch: Legacy.Server['plugins']['elasticsearch'];
    xpack_main: XPackMainPlugin & {
      status?: any;
    };
    reporting: ReportingPluginSpecOptions;
  };
  route: Legacy.Server['route'];
  savedObjects: Legacy.Server['savedObjects'];
  uiSettingsServiceFactory: Legacy.Server['uiSettingsServiceFactory'];
}

export class ReportingPlugin implements Plugin<void, void, ReportingSetupDeps, ReportingStartDeps> {
  constructor(private context: PluginInitializerContext) {}

  public async setup(core: CoreSetup, plugins: ReportingSetupDeps) {
    const { elasticsearch, usageCollection, __LEGACY } = plugins;
    const exportTypesRegistry = getExportTypesRegistry();

    let isCollectorReady = false;

    // Register a function with server to manage the collection of usage stats
    registerReportingUsageCollector(
      usageCollection,
      __LEGACY,
      () => isCollectorReady,
      exportTypesRegistry
    );

    const logger = new LevelLogger(this.context.logger.get('reporting'));
    const browserDriverFactory = await createBrowserDriverFactory(__LEGACY, logger);

    logConfiguration(__LEGACY, logger);
    runValidations(__LEGACY, elasticsearch, logger, browserDriverFactory);

    const { xpack_main: xpackMainPlugin, reporting } = __LEGACY.plugins;
    mirrorPluginStatus(xpackMainPlugin, reporting);

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
  }

  public start(core: CoreStart, plugins: ReportingStartDeps) {
    setFieldFormats(plugins.data.fieldFormats);
  }
}
