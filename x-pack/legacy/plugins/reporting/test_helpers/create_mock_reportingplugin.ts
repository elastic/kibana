/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../server/routes');
jest.mock('../server/usage');
jest.mock('../server/browsers');
jest.mock('../server/browsers');
jest.mock('../server/lib/create_queue');
jest.mock('../server/lib/enqueue_job');
jest.mock('../server/lib/validate');
jest.mock('../log_configuration');

import { EventEmitter } from 'events';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { coreMock } from 'src/core/server/mocks';
import { ReportingPlugin, ReportingCore } from '../server';
import { ReportingSetupDeps, ReportingStartDeps } from '../server/types';

export const createMockSetupDeps = (setupMock?: any): ReportingSetupDeps => ({
  elasticsearch: setupMock.elasticsearch,
  security: setupMock.security,
  usageCollection: {} as any,
  __LEGACY: { plugins: { xpack_main: { status: new EventEmitter() } } } as any,
});

export const createMockStartDeps = (startMock?: any): ReportingStartDeps => ({
  data: startMock.data,
  elasticsearch: startMock.elasticsearch,
  __LEGACY: {} as any,
});

const createMockReportingPlugin = async (config = {}): Promise<ReportingPlugin> => {
  const plugin = new ReportingPlugin(coreMock.createPluginInitializerContext(config));
  const setupMock = coreMock.createSetup();
  const coreStartMock = coreMock.createStart();
  const startMock = {
    ...coreStartMock,
    data: { fieldFormats: {} },
  };

  await plugin.setup(setupMock, createMockSetupDeps(setupMock));
  await plugin.start(startMock, createMockStartDeps(startMock));

  return plugin;
};

export const createMockReportingCore = async (config = {}): Promise<ReportingCore> => {
  const plugin = await createMockReportingPlugin(config);
  return plugin.getReportingCore();
};
