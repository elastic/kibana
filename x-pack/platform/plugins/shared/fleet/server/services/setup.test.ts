/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { LockAcquisitionError } from '@kbn/lock-manager';

import type { Logger } from '@kbn/core/server';

import { MessageSigningError } from '../../common/errors';
import { createAppContextStartContractMock, xpackMocks } from '../mocks';

import { ensurePreconfiguredPackagesAndPolicies } from '.';

import { appContextService } from './app_context';
import { getInstallations } from './epm/packages';
import { setupUpgradeManagedPackagePolicies } from './setup/managed_package_policies';
import { getPreconfiguredDeleteUnenrolledAgentsSettingFromConfig } from './preconfiguration/delete_unenrolled_agent_setting';
import { _runSetupWithLock, setupFleet } from './setup';
import { isPackageInstalled } from './epm/packages/install';
import { upgradeAgentPolicySchemaVersion } from './setup/upgrade_agent_policy_schema_version';
import {
  createCCSIndexPatterns,
  createOrUpdateFleetSyncedIntegrationsIndex,
} from './setup/fleet_synced_integrations';
import { getSpaceAwareSaveobjectsClients } from './epm/kibana/assets/saved_objects';

jest.mock('./app_context');
jest.mock('./preconfiguration');
jest.mock('./preconfiguration/outputs');
jest.mock('./preconfiguration/fleet_proxies');
jest.mock('./preconfiguration/space_settings');
jest.mock('./preconfiguration/fleet_server_host');
jest.mock('./preconfiguration/delete_unenrolled_agent_setting');
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
jest.mock('./epm/packages/install');
jest.mock('./setup/upgrade_agent_policy_schema_version');
jest.mock('./setup/fleet_synced_integrations');
jest.mock('./epm/kibana/assets/saved_objects');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

let mockedLogger: jest.Mocked<Logger>;

const mockedMethodThrowsError = (mockFn: jest.Mock) =>
  mockFn.mockImplementation(() => {
    throw new Error('SO method mocked to throw');
  });

class CustomTestError extends Error {}
const mockedMethodThrowsCustom = (mockFn: jest.Mock) =>
  mockFn.mockImplementation(() => {
    throw new CustomTestError('method mocked to throw');
  });

function getMockedSoClient() {
  const soClient = savedObjectsClientMock.create();
  mockedAppContextService.getInternalUserSOClient.mockReturnValue(soClient);

  soClient.get.mockResolvedValue({ attributes: {} } as any);
  soClient.find.mockResolvedValue({ saved_objects: [] } as any);
  soClient.bulkGet.mockResolvedValue({ saved_objects: [] } as any);
  soClient.create.mockResolvedValue({ attributes: {} } as any);
  soClient.delete.mockResolvedValue({});

  return soClient;
}

describe('setupFleet', () => {
  let context: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
  let esClient: ElasticsearchClientMock;

  beforeEach(async () => {
    context = xpackMocks.createRequestHandlerContext();
    // prevents `Logger not set.` and other appContext errors
    mockedAppContextService.start(createAppContextStartContractMock());
    esClient = context.core.elasticsearch.client.asInternalUser;
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);

    (getInstallations as jest.Mock).mockResolvedValueOnce({
      saved_objects: [],
    });

    (ensurePreconfiguredPackagesAndPolicies as jest.Mock).mockResolvedValue({
      nonFatalErrors: [],
    });

    (setupUpgradeManagedPackagePolicies as jest.Mock).mockResolvedValue([]);
    (getPreconfiguredDeleteUnenrolledAgentsSettingFromConfig as jest.Mock).mockResolvedValue([]);
    (isPackageInstalled as jest.Mock).mockResolvedValue(true);
    (upgradeAgentPolicySchemaVersion as jest.Mock).mockResolvedValue(undefined);
    (createOrUpdateFleetSyncedIntegrationsIndex as jest.Mock).mockResolvedValue(undefined);
    (createCCSIndexPatterns as jest.Mock).mockResolvedValue(undefined);
    (getSpaceAwareSaveobjectsClients as jest.Mock).mockReturnValue({});
  });

  afterEach(async () => {
    jest.clearAllMocks();
    mockedAppContextService.stop();
  });

  describe('should reject with any error thrown underneath', () => {
    it('SO client throws plain Error', async () => {
      const soClient = getMockedSoClient();
      mockedMethodThrowsError(getPreconfiguredDeleteUnenrolledAgentsSettingFromConfig as jest.Mock);

      const setupPromise = setupFleet(soClient, esClient);
      await expect(setupPromise).rejects.toThrow('SO method mocked to throw');
      await expect(setupPromise).rejects.toThrow(Error);
    });

    it('SO client throws other error', async () => {
      const soClient = getMockedSoClient();

      mockedMethodThrowsCustom(setupUpgradeManagedPackagePolicies as jest.Mock);

      const setupPromise = setupFleet(soClient, esClient);
      await expect(setupPromise).rejects.toThrow('method mocked to throw');
      await expect(setupPromise).rejects.toThrow(CustomTestError);
    });
  });

  it('should not return non fatal errors when upgrade result has no errors', async () => {
    const soClient = getMockedSoClient();

    const result = await setupFleet(soClient, esClient);

    expect(result).toEqual({
      isInitialized: true,
      nonFatalErrors: [],
    });
  });

  it('should return non fatal errors when generateKeyPair result has errors', async () => {
    const soClient = getMockedSoClient();

    const messageSigningError = new MessageSigningError('test');
    mockedAppContextService.getMessageSigningService.mockImplementation(() => ({
      generateKeyPair: jest.fn().mockRejectedValueOnce(messageSigningError),
      rotateKeyPair: jest.fn(),
      isEncryptionAvailable: true,
      sign: jest.fn(),
      getPublicKey: jest.fn(),
    }));

    const result = await setupFleet(soClient, esClient);

    expect(result).toEqual({
      isInitialized: true,
      nonFatalErrors: [
        {
          error: messageSigningError,
        },
      ],
    });
  });
});

describe('_runSetupWithLock', () => {
  let mockedWithLock: jest.Mock<any, any, any>;
  beforeEach(() => {
    mockedWithLock = jest.fn();
    mockedAppContextService.getLockManagerService.mockReturnValue({
      withLock: mockedWithLock as any,
    } as any);
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
