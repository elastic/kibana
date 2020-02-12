/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import * as Rx from 'rxjs';
import { first } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  ElasticsearchServiceSetup,
  IUiSettingsClient,
  KibanaRequest,
  Plugin,
  PluginInitializerContext,
  SavedObjectsClient,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
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
  security: SecurityPluginSetup;
  usageCollection: UsageCollectionSetup;
  __LEGACY: LegacySetup;
}

export interface ReportingStartDeps {
  elasticsearch: ElasticsearchServiceSetup;
  data: DataPluginStart;
  __LEGACY: LegacySetup;
}

export interface ReportingSetup {
  browserDriverFactory: HeadlessChromiumDriverFactory;
}

export interface ReportingStart {
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  enqueueJob: EnqueueJobFn;
  esqueue: ESQueueInstance;
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
}

export class ReportingPlugin
  implements Plugin<ReportingSetup, ReportingStart, ReportingSetupDeps, ReportingStartDeps> {
  private exportTypesRegistry = getExportTypesRegistry();
  private logger = new LevelLogger(this.context.logger.get('reporting'));
  private pluginSetupDeps?: ReportingSetup;
  private pluginStartDeps?: ReportingStart;
  private readonly pluginSetup$ = new Rx.ReplaySubject<ReportingSetup>();
  private readonly pluginStart$ = new Rx.ReplaySubject<ReportingStart>();

  constructor(private context: PluginInitializerContext) {}

  public async setup(core: CoreSetup, plugins: ReportingSetupDeps) {
    const { elasticsearch, usageCollection, __LEGACY } = plugins;
    const { xpack_main: xpackMainPlugin, reporting } = __LEGACY.plugins;

    const browserDriverFactory = await createBrowserDriverFactory(__LEGACY, this.logger); // required for validations :(
    runValidations(__LEGACY, elasticsearch, browserDriverFactory, this.logger); // this must run early, as it sets up config defaults

    // LEGACY
    mirrorPluginStatus(xpackMainPlugin, reporting);
    const checkLicense = checkLicenseFactory(this.exportTypesRegistry);
    (xpackMainPlugin as any).status.once('green', () => {
      // Register a function that is called whenever the xpack info changes,
      // to re-compute the license check results for this plugin
      xpackMainPlugin.info.feature(PLUGIN_ID).registerLicenseCheckResultsGenerator(checkLicense);
    });
    // Reporting routes
    registerRoutes(this, __LEGACY, plugins, this.logger);
    // END LEGACY

    // Register a function with server to manage the collection of usage stats
    registerReportingUsageCollector(__LEGACY, usageCollection, this.exportTypesRegistry);

    this.pluginSetup$.next({ browserDriverFactory });
    return { browserDriverFactory };
  }

  public async start(core: CoreStart, plugins: ReportingStartDeps) {
    const { elasticsearch, __LEGACY } = plugins;

    const esqueue = await createQueueFactory(this, __LEGACY, elasticsearch, this.logger);
    const enqueueJob = enqueueJobFactory(this, __LEGACY, elasticsearch, this.logger);

    this.pluginStartDeps = {
      savedObjects: core.savedObjects,
      uiSettings: core.uiSettings,
      esqueue,
      enqueueJob,
    };

    this.pluginStart$.next(this.pluginStartDeps);

    setFieldFormats(plugins.data.fieldFormats);
    logConfiguration(__LEGACY, this.logger);

    return this.pluginStartDeps;
  }

  private async getPluginSetupDeps() {
    if (this.pluginSetupDeps) {
      return this.pluginSetupDeps;
    }
    return await this.pluginSetup$.pipe(first()).toPromise();
  }

  private async getPluginStartDeps() {
    if (this.pluginStartDeps) {
      return this.pluginStartDeps;
    }
    return await this.pluginStart$.pipe(first()).toPromise();
  }

  public getExportTypesRegistry() {
    return this.exportTypesRegistry;
  }

  public async getSavedObjectsClient(fakeRequest: KibanaRequest): Promise<SavedObjectsClient> {
    const { savedObjects } = await this.getPluginStartDeps();
    return savedObjects.getScopedClient(fakeRequest) as SavedObjectsClient;
  }

  public async getUiSettingsServiceFactory(
    savedObjectsClient: SavedObjectsClient
  ): Promise<IUiSettingsClient> {
    const { uiSettings: uiSettingsService } = await this.getPluginStartDeps();
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
  }

  public async getEsqueue(): Promise<ESQueueInstance> {
    return (await this.getPluginStartDeps()).esqueue;
  }

  public async getEnqueueJob(): Promise<EnqueueJobFn> {
    return (await this.getPluginStartDeps()).enqueueJob;
  }

  public async getBrowserDriverFactory(): Promise<HeadlessChromiumDriverFactory> {
    return (await this.getPluginSetupDeps()).browserDriverFactory;
  }
}
