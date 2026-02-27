/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityMock } from '@kbn/security-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { Logger } from '@kbn/core/server';

import { appContextService } from '../../server/services/app_context';

import {
  getAllTestPackagesPaths,
  getAllTestPackagesZip,
  verifyTestPackage,
  verifyTestPackageFromPath,
} from './verify_test_packages';

jest.mock('../../server/services/app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

let mockedLogger: jest.Mocked<Logger>;

describe('Test packages', () => {
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
  });

  for (const zip of getAllTestPackagesZip()) {
    test(`${zip} should be a valid package`, async () => {
      await verifyTestPackage(zip);
    });
  }

  for (const { topLevelDir, paths } of getAllTestPackagesPaths()) {
    test(`${topLevelDir} should be a valid package`, async () => {
      await verifyTestPackageFromPath(paths, topLevelDir);
    });
  }
});
