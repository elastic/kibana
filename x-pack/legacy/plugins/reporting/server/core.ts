/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { first, mapTo } from 'rxjs/operators';
import {
  ElasticsearchServiceSetup,
  IUiSettingsClient,
  KibanaRequest,
  SavedObjectsClient,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
} from 'src/core/server';
import { ConfigType as ReportingConfigType } from '../../../../plugins/reporting/server';
// @ts-ignore no module definition
import { mirrorPluginStatus } from '../../../server/lib/mirror_plugin_status';
import { XPackMainPlugin } from '../../xpack_main/server/xpack_main';
import { PLUGIN_ID } from '../common/constants';
import { EnqueueJobFn, ESQueueInstance, ReportingPluginSpecOptions, ServerFacade } from '../types';
import { HeadlessChromiumDriverFactory } from './browsers/chromium/driver_factory';
import { checkLicenseFactory, getExportTypesRegistry, LevelLogger } from './lib';
import { registerRoutes } from './routes';
import { ReportingSetupDeps } from './types';

interface ReportingInternalSetup {
  browserDriverFactory: HeadlessChromiumDriverFactory;
  config: ReportingConfig;
  elasticsearch: ElasticsearchServiceSetup;
}
interface ReportingInternalStart {
  enqueueJob: EnqueueJobFn;
  esqueue: ESQueueInstance;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
}

// make config.get() aware of the value type it returns
interface Config<BaseType> {
  get<Key1 extends keyof BaseType>(key1: Key1): BaseType[Key1];
  get<Key1 extends keyof BaseType, Key2 extends keyof BaseType[Key1]>(
    key1: Key1,
    key2: Key2
  ): BaseType[Key1][Key2];
  get<
    Key1 extends keyof BaseType,
    Key2 extends keyof BaseType[Key1],
    Key3 extends keyof BaseType[Key1][Key2]
  >(
    key1: Key1,
    key2: Key2,
    key3: Key3
  ): BaseType[Key1][Key2][Key3];
  get<
    Key1 extends keyof BaseType,
    Key2 extends keyof BaseType[Key1],
    Key3 extends keyof BaseType[Key1][Key2],
    Key4 extends keyof BaseType[Key1][Key2][Key3]
  >(
    key1: Key1,
    key2: Key2,
    key3: Key3,
    key4: Key4
  ): BaseType[Key1][Key2][Key3][Key4];
}

interface KbnServerConfigType {
  path: { data: string };
  server: {
    basePath: string;
    host: string;
    name: string;
    port: number;
    protocol: string;
    uuid: string;
  };
}

export interface ReportingConfig extends Config<ReportingConfigType> {
  kbnConfig: Config<KbnServerConfigType>;
}

export { ReportingConfigType };

export class ReportingCore {
  private pluginSetupDeps?: ReportingInternalSetup;
  private pluginStartDeps?: ReportingInternalStart;
  private readonly pluginSetup$ = new Rx.ReplaySubject<ReportingInternalSetup>();
  private readonly pluginStart$ = new Rx.ReplaySubject<ReportingInternalStart>();
  private exportTypesRegistry = getExportTypesRegistry();

  constructor(private logger: LevelLogger) {}

  legacySetup(
    xpackMainPlugin: XPackMainPlugin,
    reporting: ReportingPluginSpecOptions,
    config: ReportingConfig,
    __LEGACY: ServerFacade,
    plugins: ReportingSetupDeps
  ) {
    mirrorPluginStatus(xpackMainPlugin, reporting);
    const checkLicense = checkLicenseFactory(this.exportTypesRegistry);
    (xpackMainPlugin as any).status.once('green', () => {
      // Register a function that is called whenever the xpack info changes,
      // to re-compute the license check results for this plugin
      xpackMainPlugin.info.feature(PLUGIN_ID).registerLicenseCheckResultsGenerator(checkLicense);
    });
    // Reporting routes
    registerRoutes(this, config, __LEGACY, plugins, this.logger);
  }

  public pluginSetup(reportingSetupDeps: ReportingInternalSetup) {
    this.pluginSetup$.next(reportingSetupDeps);
  }

  public pluginStart(reportingStartDeps: ReportingInternalStart) {
    this.pluginStart$.next(reportingStartDeps);
  }

  public pluginHasStarted(): Promise<boolean> {
    return this.pluginStart$.pipe(first(), mapTo(true)).toPromise();
  }

  /*
   * Internal module dependencies
   */
  public getExportTypesRegistry() {
    return this.exportTypesRegistry;
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

  public async getConfig(): Promise<ReportingConfig> {
    return (await this.getPluginSetupDeps()).config;
  }

  /*
   * Outside dependencies
   */
  private async getPluginSetupDeps(): Promise<ReportingInternalSetup> {
    if (this.pluginSetupDeps) {
      return this.pluginSetupDeps;
    }
    return await this.pluginSetup$.pipe(first()).toPromise();
  }

  private async getPluginStartDeps(): Promise<ReportingInternalStart> {
    if (this.pluginStartDeps) {
      return this.pluginStartDeps;
    }
    return await this.pluginStart$.pipe(first()).toPromise();
  }

  public async getElasticsearchService(): Promise<ElasticsearchServiceSetup> {
    return (await this.getPluginSetupDeps()).elasticsearch;
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
}
