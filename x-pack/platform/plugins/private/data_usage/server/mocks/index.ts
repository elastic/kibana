/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { DeepReadonly } from 'utility-types';
import { PluginInitializerContext } from '@kbn/core/server';
import { Observable } from 'rxjs';
import { DataUsageContext } from '../types';
import { DataUsageConfigType } from '../config';

export interface MockedDataUsageContext extends DataUsageContext {
  logFactory: ReturnType<ReturnType<typeof loggingSystemMock.create>['get']>;
  config$?: Observable<DataUsageConfigType>;
  configInitialValue: DataUsageConfigType;
  serverConfig: DeepReadonly<DataUsageConfigType>;
  kibanaInstanceId: PluginInitializerContext['env']['instanceUuid'];
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  kibanaBranch: PluginInitializerContext['env']['packageInfo']['branch'];
}

export const createMockedDataUsageContext = (
  context: PluginInitializerContext<DataUsageConfigType>
): MockedDataUsageContext => {
  return {
    logFactory: loggingSystemMock.create().get(),
    config$: context.config.create<DataUsageConfigType>(),
    configInitialValue: context.config.get(),
    serverConfig: context.config.get(),
    kibanaInstanceId: context.env.instanceUuid,
    kibanaVersion: context.env.packageInfo.version,
    kibanaBranch: context.env.packageInfo.branch,
  };
};
