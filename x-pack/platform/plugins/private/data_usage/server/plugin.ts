/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { LoggerFactory } from '@kbn/logging';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { DataUsageConfigType, createConfig } from './config';
import type {
  DataUsageContext,
  DataUsageRequestHandlerContext,
  DataUsageServerSetup,
  DataUsageServerStart,
  DataUsageSetupDependencies,
  DataUsageStartDependencies,
} from './types';
import { registerDataUsageRoutes } from './routes';
import { PLUGIN_ID } from '../common';
import { appContextService } from './services/app_context';

export class DataUsagePlugin
  implements
    Plugin<
      DataUsageServerSetup,
      DataUsageServerStart,
      DataUsageSetupDependencies,
      DataUsageStartDependencies
    >
{
  private readonly logger: LoggerFactory;
  private dataUsageContext: DataUsageContext;

  private config$: Observable<DataUsageConfigType>;
  private configInitialValue: DataUsageConfigType;
  private cloud?: CloudSetup;

  private kibanaVersion: DataUsageContext['kibanaVersion'];
  private kibanaBranch: DataUsageContext['kibanaBranch'];
  private kibanaInstanceId: DataUsageContext['kibanaInstanceId'];

  constructor(context: PluginInitializerContext<DataUsageConfigType>) {
    this.config$ = context.config.create<DataUsageConfigType>();
    this.kibanaVersion = context.env.packageInfo.version;
    this.kibanaBranch = context.env.packageInfo.branch;
    this.kibanaInstanceId = context.env.instanceUuid;
    this.logger = context.logger;
    this.configInitialValue = context.config.get();
    const serverConfig = createConfig(context);

    this.logger.get().debug('data usage plugin initialized');

    this.dataUsageContext = {
      config$: context.config.create<DataUsageConfigType>(),
      configInitialValue: context.config.get(),
      logFactory: context.logger,
      get serverConfig() {
        return serverConfig;
      },
      kibanaVersion: context.env.packageInfo.version,
      kibanaBranch: context.env.packageInfo.branch,
      kibanaInstanceId: context.env.instanceUuid,
    };
  }
  setup(coreSetup: CoreSetup, pluginsSetup: DataUsageSetupDependencies): DataUsageServerSetup {
    this.logger.get().debug('data usage plugin setup');
    this.cloud = pluginsSetup.cloud;

    pluginsSetup.features.registerElasticsearchFeature({
      id: PLUGIN_ID,
      management: {
        data: [PLUGIN_ID],
      },
      privileges: [
        {
          requiredClusterPrivileges: ['monitor'],
          ui: [],
        },
      ],
    });
    const router = coreSetup.http.createRouter<DataUsageRequestHandlerContext>();
    registerDataUsageRoutes(router, this.dataUsageContext);

    return {};
  }

  start(_coreStart: CoreStart, _pluginsStart: DataUsageStartDependencies): DataUsageServerStart {
    appContextService.start({
      configInitialValue: this.configInitialValue,
      config$: this.config$,
      kibanaVersion: this.kibanaVersion,
      kibanaBranch: this.kibanaBranch,
      kibanaInstanceId: this.kibanaInstanceId,
      cloud: this.cloud,
      logFactory: this.logger,
      serverConfig: this.dataUsageContext.serverConfig,
    });
    return {};
  }

  public stop() {
    this.logger.get().debug('Stopping data usage plugin');
  }
}
