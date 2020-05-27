/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { first, mapTo } from 'rxjs/operators';
import {
  ElasticsearchServiceSetup,
  KibanaRequest,
  SavedObjectsClient,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
} from 'src/core/server';
import { ReportingPluginSpecOptions } from '../';
// @ts-ignore no module definition
import { mirrorPluginStatus } from '../../../server/lib/mirror_plugin_status';
import { XPackMainPlugin } from '../../xpack_main/server/xpack_main';
import { PLUGIN_ID } from '../common/constants';
import { screenshotsObservableFactory } from '../export_types/common/lib/screenshots';
import { ServerFacade } from '../server/types';
import { ReportingConfig } from './';
import { HeadlessChromiumDriverFactory } from './browsers/chromium/driver_factory';
import { checkLicenseFactory, getExportTypesRegistry, LevelLogger } from './lib';
import { ESQueueInstance } from './lib/create_queue';
import { EnqueueJobFn } from './lib/enqueue_job';
import { registerRoutes } from './routes';
import { ReportingSetupDeps } from './types';

interface ReportingInternalSetup {
  browserDriverFactory: HeadlessChromiumDriverFactory;
  elasticsearch: ElasticsearchServiceSetup;
}
interface ReportingInternalStart {
  enqueueJob: EnqueueJobFn;
  esqueue: ESQueueInstance;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
}

export class ReportingCore {
  private pluginSetupDeps?: ReportingInternalSetup;
  private pluginStartDeps?: ReportingInternalStart;
  private readonly pluginSetup$ = new Rx.ReplaySubject<ReportingInternalSetup>();
  private readonly pluginStart$ = new Rx.ReplaySubject<ReportingInternalStart>();
  private exportTypesRegistry = getExportTypesRegistry();

  constructor(private logger: LevelLogger, private config: ReportingConfig) {}

  legacySetup(
    xpackMainPlugin: XPackMainPlugin,
    reporting: ReportingPluginSpecOptions,
    __LEGACY: ServerFacade,
    plugins: ReportingSetupDeps
  ) {
    // legacy plugin status
    mirrorPluginStatus(xpackMainPlugin, reporting);

    // legacy license check
    const checkLicense = checkLicenseFactory(this.exportTypesRegistry);
    (xpackMainPlugin as any).status.once('green', () => {
      // Register a function that is called whenever the xpack info changes,
      // to re-compute the license check results for this plugin
      xpackMainPlugin.info.feature(PLUGIN_ID).registerLicenseCheckResultsGenerator(checkLicense);
    });

    // legacy routes
    registerRoutes(this, __LEGACY, plugins, this.logger);
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

  public async getEsqueue() {
    return (await this.getPluginStartDeps()).esqueue;
  }

  public async getEnqueueJob() {
    return (await this.getPluginStartDeps()).enqueueJob;
  }

  public getConfig() {
    return this.config;
  }
  public async getScreenshotsObservable() {
    const { browserDriverFactory } = await this.getPluginSetupDeps();
    return screenshotsObservableFactory(this.config.get('capture'), browserDriverFactory);
  }

  /*
   * Outside dependencies
   */
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

  public async getElasticsearchService() {
    return (await this.getPluginSetupDeps()).elasticsearch;
  }

  public async getSavedObjectsClient(fakeRequest: KibanaRequest) {
    const { savedObjects } = await this.getPluginStartDeps();
    return savedObjects.getScopedClient(fakeRequest) as SavedObjectsClient;
  }

  public async getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClient) {
    const { uiSettings: uiSettingsService } = await this.getPluginStartDeps();
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
  }
}
