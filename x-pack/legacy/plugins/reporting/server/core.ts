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
  IRouter,
  IBasePath,
} from 'src/core/server';
// @ts-ignore no module definition
import { mirrorPluginStatus } from '../../../server/lib/mirror_plugin_status';
import { ILicense } from '../../../../plugins/licensing/server';
import { XPackMainPlugin } from '../../xpack_main/server/xpack_main';
import { EnqueueJobFn, ESQueueInstance, ReportingPluginSpecOptions, ServerFacade } from '../types';
import { HeadlessChromiumDriverFactory } from './browsers/chromium/driver_factory';
import { ReportingConfig, ReportingConfigType } from './config';
import { LevelLogger, getExportTypesRegistry, checkLicense } from './lib';
import { registerRoutes } from './routes';
import { ReportingSetupDeps } from './types';
import {
  screenshotsObservableFactory,
  ScreenshotsObservableFn,
} from '../export_types/common/lib/screenshots';

interface ReportingInternalSetup {
  browserDriverFactory: HeadlessChromiumDriverFactory;
  elasticsearch: ElasticsearchServiceSetup;
  license$: Rx.Observable<ILicense>;
}

interface ReportingInternalStart {
  enqueueJob: EnqueueJobFn;
  esqueue: ESQueueInstance;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
}

export { ReportingConfig, ReportingConfigType };

export class ReportingCore {
  pluginSetupDeps?: ReportingInternalSetup;
  private license?: ILicense;
  private pluginStartDeps?: ReportingInternalStart;
  private readonly pluginSetup$ = new Rx.ReplaySubject<ReportingInternalSetup>();
  private readonly pluginStart$ = new Rx.ReplaySubject<ReportingInternalStart>();
  private exportTypesRegistry = getExportTypesRegistry();

  constructor(private logger: LevelLogger, private config: ReportingConfig) {}

  legacySetup(
    xpackMainPlugin: XPackMainPlugin,
    reporting: ReportingPluginSpecOptions,
    __LEGACY: ServerFacade
  ) {
    // legacy plugin status
    mirrorPluginStatus(xpackMainPlugin, reporting);
  }

  public setupRoutes(plugins: ReportingSetupDeps, router: IRouter, basePath: IBasePath['get']) {
    registerRoutes(this, plugins, router, basePath, this.logger);
  }

  public pluginSetup(reportingSetupDeps: ReportingInternalSetup) {
    this.pluginSetup$.next(reportingSetupDeps);
    reportingSetupDeps.license$.subscribe(license => (this.license = license));
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

  public getLicenseInfo() {
    return checkLicense(this.getExportTypesRegistry(), this.license);
  }

  public getConfig(): ReportingConfig {
    return this.config;
  }

  public async getScreenshotsObservable(): Promise<ScreenshotsObservableFn> {
    const { browserDriverFactory } = await this.getPluginSetupDeps();
    return screenshotsObservableFactory(this.config.get('capture'), browserDriverFactory);
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
