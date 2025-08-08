/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { mlPluginServerMock } from '@kbn/ml-plugin/server/mocks';
import { SearchConnectorsPluginSetupDependencies } from '../types';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import { SavedObjectsServiceSetup } from '@kbn/core/server';

export const mockLogger = loggingSystemMock.createLogger().get();

export const mockMl = mlPluginServerMock.createSetupContract();
export const mockFeatures = featuresPluginMock.createSetup();
const soClientMock = savedObjectsClientMock.create() as unknown as SavedObjectsServiceSetup;
const cloud = cloudMock.createSetup();
const routerMock = mockRouter.create();
const taskManager = taskManagerMock.createSetup();

/**
 * This is useful for tests that don't use either config or log,
 * but should still pass them in to pass Typescript definitions
 */
export const mockDependencies: SearchConnectorsPluginSetupDependencies = {
  // Mock router should be handled on a per-test basis
  getStartServices: jest.fn(),
  log: mockLogger,
  ml: mockMl,
  features: mockFeatures,
  fleet: undefined,
  taskManager,
  soClient: soClientMock,
  cloud,
  router: routerMock,
};
