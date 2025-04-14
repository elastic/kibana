/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';

import { MessageSigningError } from '../../common/errors';
import { createAppContextStartContractMock, xpackMocks } from '../mocks';

import { ensurePreconfiguredPackagesAndPolicies } from '.';

import { appContextService } from './app_context';
import { getInstallations } from './epm/packages';
import { setupUpgradeManagedPackagePolicies } from './setup/managed_package_policies';
import { setupFleet } from './setup';

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

  it('should create and delete lock if not exists', async () => {
    soClient.get.mockRejectedValue({ isBoom: true, output: { statusCode: 404 } } as any);

    const result = await setupFleet(soClient, esClient, { useLock: true });

    expect(result).toEqual({
      isInitialized: true,
      nonFatalErrors: [],
    });
    expect(soClient.create).toHaveBeenCalledWith('fleet-setup-lock', expect.anything(), {
      id: 'fleet-setup-lock',
    });
    expect(soClient.delete).toHaveBeenCalledWith('fleet-setup-lock', 'fleet-setup-lock', {
      refresh: true,
    });
  });

  it('should return not initialized if lock exists', async () => {
    const result = await setupFleet(soClient, esClient, { useLock: true });

    expect(result).toEqual({
      isInitialized: false,
      nonFatalErrors: [],
    });
    expect(soClient.create).not.toHaveBeenCalled();
    expect(soClient.delete).not.toHaveBeenCalled();
  });

  it('should return not initialized if lock could not be created', async () => {
    soClient.get.mockRejectedValue({ isBoom: true, output: { statusCode: 404 } } as any);
    soClient.create.mockRejectedValue({ isBoom: true, output: { statusCode: 409 } } as any);
    const result = await setupFleet(soClient, esClient, { useLock: true });

    expect(result).toEqual({
      isInitialized: false,
      nonFatalErrors: [],
    });
    expect(soClient.delete).not.toHaveBeenCalled();
  });

  it('should delete previous lock if created more than 1 hour ago', async () => {
    soClient.get.mockResolvedValue({
      attributes: { started_at: new Date(Date.now() - 60 * 60 * 1000 - 1000).toISOString() },
    } as any);

    const result = await setupFleet(soClient, esClient, { useLock: true });

    expect(result).toEqual({
      isInitialized: true,
      nonFatalErrors: [],
    });
    expect(soClient.create).toHaveBeenCalled();
    expect(soClient.delete).toHaveBeenCalledTimes(2);
  });
});
