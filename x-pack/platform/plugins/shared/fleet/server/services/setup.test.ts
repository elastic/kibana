/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { LockAcquisitionError } from '@kbn/lock-manager';

import { MessageSigningError } from '../../common/errors';
import { createAppContextStartContractMock, xpackMocks } from '../mocks';

import { ensurePreconfiguredPackagesAndPolicies } from '.';

import { appContextService } from './app_context';
import { getInstallations } from './epm/packages';
import { setupUpgradeManagedPackagePolicies } from './setup/managed_package_policies';
import { _runSetupWithLock, setupFleet } from './setup';

jest.mock('./preconfiguration');
jest.mock('./preconfiguration/outputs');
jest.mock('./preconfiguration/fleet_proxies');
jest.mock('./preconfiguration/space_settings');
jest.mock('./settings');
jest.mock('./output');
jest.mock('./download_source');
jest.mock('./epm/packages');
jest.mock('./setup/managed_package_policies');
jest.mock('./setup/upgrade_package_install_version');
jest.mock('./setup/update_deprecated_component_templates');
jest.mock('./epm/elasticsearch/template/install', () => {
  return {
    ...jest.requireActual('./epm/elasticsearch/template/install'),
  };
});
jest.mock('./backfill_agentless');

const mockedMethodThrowsError = (mockFn: jest.Mock) =>
  mockFn.mockImplementation(() => {
    throw new Error('SO method mocked to throw');
  });

class CustomTestError extends Error {}
const mockedMethodThrowsCustom = (mockFn: jest.Mock) =>
  mockFn.mockImplementation(() => {
    throw new CustomTestError('method mocked to throw');
  });

describe('setupFleet', () => {
  let context: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: ElasticsearchClientMock;

  beforeEach(async () => {
    context = xpackMocks.createRequestHandlerContext();
    // prevents `Logger not set.` and other appContext errors
    appContextService.start(createAppContextStartContractMock());
    soClient = context.core.savedObjects.client;
    esClient = context.core.elasticsearch.client.asInternalUser;

    (getInstallations as jest.Mock).mockResolvedValueOnce({
      saved_objects: [],
    });

    (ensurePreconfiguredPackagesAndPolicies as jest.Mock).mockResolvedValue({
      nonFatalErrors: [],
    });

    (setupUpgradeManagedPackagePolicies as jest.Mock).mockResolvedValue([]);

    soClient.get.mockResolvedValue({ attributes: {} } as any);
    soClient.find.mockResolvedValue({ saved_objects: [] } as any);
    soClient.bulkGet.mockResolvedValue({ saved_objects: [] } as any);
    soClient.create.mockResolvedValue({ attributes: {} } as any);
    soClient.delete.mockResolvedValue({});
  });

  afterEach(async () => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  describe('should reject with any error thrown underneath', () => {
    it('SO client throws plain Error', async () => {
      mockedMethodThrowsError(setupUpgradeManagedPackagePolicies as jest.Mock);

      const setupPromise = setupFleet(soClient, esClient);
      await expect(setupPromise).rejects.toThrow('SO method mocked to throw');
      await expect(setupPromise).rejects.toThrow(Error);
    });

    it('SO client throws other error', async () => {
      mockedMethodThrowsCustom(setupUpgradeManagedPackagePolicies as jest.Mock);

      const setupPromise = setupFleet(soClient, esClient);
      await expect(setupPromise).rejects.toThrow('method mocked to throw');
      await expect(setupPromise).rejects.toThrow(CustomTestError);
    });
  });

  it('should not return non fatal errors when upgrade result has no errors', async () => {
    const result = await setupFleet(soClient, esClient);

    expect(result).toEqual({
      isInitialized: true,
      nonFatalErrors: [],
    });
  });

  it('should return non fatal errors when generateKeyPair result has errors', async () => {
    const messageSigninError = new MessageSigningError('test');
    jest
      .mocked(appContextService.getMessageSigningService()!.generateKeyPair)
      .mockRejectedValue(messageSigninError);

    const result = await setupFleet(soClient, esClient);

    expect(result).toEqual({
      isInitialized: true,
      nonFatalErrors: [
        {
          error: messageSigninError,
        },
      ],
    });
  });
});

describe('_runSetupWithLock', () => {
  let mockedWithLock: jest.Mock<any, any, any>;
  beforeEach(() => {
    mockedWithLock = jest.fn();
    appContextService.start({
      ...createAppContextStartContractMock(),
      lockManagerService: {
        withLock: mockedWithLock as any,
      } as any,
    });
  });
  it('should retry on lock acquisition error', async () => {
    mockedWithLock
      .mockImplementationOnce(async () => {
        throw new LockAcquisitionError('test');
      })
      .mockImplementationOnce(async (id, fn) => {
        return fn();
      });

    const setupFn = jest.fn();
    await _runSetupWithLock(setupFn);

    expect(setupFn).toHaveBeenCalled();
    expect(mockedWithLock).toHaveBeenCalledTimes(2);
  });

  it('should not retry on setupFn error', async () => {
    mockedWithLock.mockImplementation(async (id, fn) => {
      return fn();
    });

    const setupFn = jest.fn();
    setupFn.mockRejectedValue(new Error('test'));

    await expect(_runSetupWithLock(setupFn)).rejects.toThrow(/test/);

    expect(setupFn).toHaveBeenCalled();
    expect(mockedWithLock).toHaveBeenCalledTimes(1);
  });
});
