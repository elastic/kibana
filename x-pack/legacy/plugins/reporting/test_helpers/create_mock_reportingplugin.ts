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

import { of } from 'rxjs';
import { EventEmitter } from 'events';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { coreMock } from 'src/core/server/mocks';
import { ReportingConfig, ReportingCore, ReportingPlugin } from '../server';
import { ReportingSetupDeps, ReportingStartDeps } from '../server/types';
import { ReportingInternalSetup } from '../server/core';

const createMockSetupDeps = (setupMock?: any): ReportingSetupDeps => {
  return {
    elasticsearch: setupMock.elasticsearch,
    security: setupMock.security,
    licensing: {
      license$: of({ isAvailable: true, isActive: true, type: 'basic' }),
    } as any,
    usageCollection: {} as any,
    __LEGACY: { plugins: { xpack_main: { status: new EventEmitter() } } } as any,
  };
};

export const createMockStartDeps = (startMock?: any): ReportingStartDeps => ({
  data: startMock.data,
  __LEGACY: {} as any,
});

const createMockReportingPlugin = async (config: ReportingConfig): Promise<ReportingPlugin> => {
  config = config || {};
  const plugin = new ReportingPlugin(coreMock.createPluginInitializerContext(config), config);
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

export const createMockReportingCore = async (
  config: ReportingConfig,
  setupDepsMock?: ReportingInternalSetup
): Promise<ReportingCore> => {
  config = config || {};
  const plugin = await createMockReportingPlugin(config);
  const core = plugin.getReportingCore();

  if (setupDepsMock) {
    // @ts-ignore overwriting private properties
    core.pluginSetupDeps = setupDepsMock;
  }

  return core;
};
