/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { errors } from '@elastic/elasticsearch';

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { LockAcquisitionError } from '@kbn/lock-manager';

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
import { createCCSIndexPatterns } from './setup/fleet_synced_integrations';
import { getSpaceAwareSaveobjectsClients } from './epm/kibana/assets/saved_objects';
import { outputService } from './output';

vi.mock('./app_context');
vi.mock('./preconfiguration');
vi.mock('./preconfiguration/outputs');
vi.mock('./preconfiguration/fleet_proxies');
vi.mock('./preconfiguration/space_settings');
vi.mock('./preconfiguration/fleet_server_host');
vi.mock('./preconfiguration/download_source');
vi.mock('./preconfiguration/delete_unenrolled_agent_setting');
vi.mock('./settings');
vi.mock('./output');
vi.mock('./download_source');
vi.mock('./epm/packages');
vi.mock('./setup/managed_package_policies');
vi.mock('./setup/upgrade_package_install_version');
vi.mock('./setup/ensure_fleet_global_es_assets');
vi.mock('./setup/update_deprecated_component_templates');
vi.mock('./epm/elasticsearch/template/install', async () => {
  return {
    ...(await vi.importActual('./epm/elasticsearch/template/install')),
  };
});
vi.mock('./backfill_agentless');
vi.mock('./epm/packages/install');
vi.mock('./setup/upgrade_agent_policy_schema_version');
vi.mock('./setup/fleet_synced_integrations');
vi.mock('./epm/kibana/assets/saved_objects');

const mockedAppContextService = appContextService as Mocked<typeof appContextService>;

const mockedMethodThrowsError = (mockFn: Mock) =>
  mockFn.mockImplementation(() => {
    throw new Error('SO method mocked to throw');
  });

class CustomTestError extends Error {}
const mockedMethodThrowsCustom = (mockFn: Mock) =>
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
    const startService = createAppContextStartContractMock();
    mockedAppContextService.start(startService);
    esClient = context.core.elasticsearch.client.asInternalUser;
    mockedAppContextService.getLogger.mockReturnValue(startService.logger);
    mockedAppContextService.getTaskManagerStart.mockReturnValue(startService.taskManagerStart);

    (getInstallations as Mock).mockResolvedValueOnce({
      saved_objects: [],
    });

    (ensurePreconfiguredPackagesAndPolicies as Mock).mockResolvedValue({
      nonFatalErrors: [],
    });

    (setupUpgradeManagedPackagePolicies as Mock).mockResolvedValue([]);
    (getPreconfiguredDeleteUnenrolledAgentsSettingFromConfig as Mock).mockResolvedValue([]);
    (isPackageInstalled as Mock).mockResolvedValue(true);
    (upgradeAgentPolicySchemaVersion as Mock).mockResolvedValue(undefined);
    (createCCSIndexPatterns as Mock).mockResolvedValue(undefined);
    (getSpaceAwareSaveobjectsClients as Mock).mockReturnValue({});
    (outputService.ensureDefaultOutput as Mock).mockResolvedValue({
      defaultOutput: { id: 'test-default-output', name: 'test' },
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();
    mockedAppContextService.stop();
  });

  describe('should reject with any error thrown underneath', () => {
    it('SO client throws plain Error', async () => {
      const soClient = getMockedSoClient();
      mockedMethodThrowsError(getPreconfiguredDeleteUnenrolledAgentsSettingFromConfig as Mock);

      const setupPromise = setupFleet(soClient, esClient);
      await expect(setupPromise).rejects.toThrow('SO method mocked to throw');
      await expect(setupPromise).rejects.toThrow(Error);
    });

    it('SO client throws other error', async () => {
      const soClient = getMockedSoClient();

      mockedMethodThrowsCustom(setupUpgradeManagedPackagePolicies as Mock);

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

  it('should call ensureDefaultOutputs during setup', async () => {
    const soClient = getMockedSoClient();

    await setupFleet(soClient, esClient);

    expect(outputService.ensureDefaultOutput).toHaveBeenCalledWith(soClient, esClient);
  });

  it('should strip heavy ES connection metadata from ResponseError stored in nonFatalErrors', async () => {
    const soClient = getMockedSoClient();

    const responseError = new errors.ResponseError({
      statusCode: 400,
      body: {
        error: {
          type: 'illegal_argument_exception',
          reason: 'Limit of total fields [2500] has been exceeded',
        },
      },
      headers: {},
      meta: {
        connection: {
          id: 'conn-1',
          url: new URL('http://localhost:9200'),
          deadCount: 0,
          resurrectTimeout: 0,
          roles: { data: true, ingest: true },
          weight: 0,
          status: 'alive',
        },
      } as any,
      warnings: null,
    } as any);

    (ensurePreconfiguredPackagesAndPolicies as Mock).mockResolvedValueOnce({
      nonFatalErrors: [{ error: responseError, package: { name: 'test', version: '1.0.0' } }],
    });

    const result = await setupFleet(soClient, esClient);

    expect(result.nonFatalErrors).toHaveLength(1);
    const stored = result.nonFatalErrors[0] as any;
    // name and message must be preserved
    expect(stored.error.name).toBe(responseError.name);
    expect(stored.error.message).toBe(responseError.message);
    // heavy connection metadata must be stripped
    expect(stored.error.meta).toBeUndefined();
    // structural context (package) must be preserved
    expect(stored.package).toEqual({ name: 'test', version: '1.0.0' });
  });

  it('should cap stored nonFatalErrors at 100 and log a warning', async () => {
    const soClient = getMockedSoClient();
    const startService = createAppContextStartContractMock();
    mockedAppContextService.getLogger.mockReturnValue(startService.logger);

    const manyErrors = Array.from({ length: 120 }, (_, i) => ({
      error: new Error(`error ${i}`),
      package: { name: 'test', version: '1.0.0' },
    }));

    (ensurePreconfiguredPackagesAndPolicies as Mock).mockResolvedValueOnce({
      nonFatalErrors: manyErrors,
    });

    const result = await setupFleet(soClient, esClient);

    expect(result.nonFatalErrors).toHaveLength(100);
    expect(startService.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('120 non-fatal errors')
    );
  });

  it('should return non fatal errors when generateKeyPair result has errors', async () => {
    const soClient = getMockedSoClient();

    const messageSigningError = new MessageSigningError('test');
    mockedAppContextService.getMessageSigningService.mockImplementation(() => ({
      generateKeyPair: vi.fn().mockRejectedValueOnce(messageSigningError),
      rotateKeyPair: vi.fn(),
      isEncryptionAvailable: true,
      sign: vi.fn(),
      getPublicKey: vi.fn(),
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
  let mockedWithLock: Mock<any, any, any>;
  beforeEach(() => {
    mockedWithLock = vi.fn();
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

    const setupFn = vi.fn();
    await _runSetupWithLock(setupFn);

    expect(setupFn).toHaveBeenCalled();
    expect(mockedWithLock).toHaveBeenCalledTimes(2);
  });

  it('should not retry on setupFn error', async () => {
    mockedWithLock.mockImplementation(async (id, fn) => {
      return fn();
    });

    const setupFn = vi.fn();
    setupFn.mockRejectedValue(new Error('test'));

    await expect(_runSetupWithLock(setupFn)).rejects.toThrow(/test/);

    expect(setupFn).toHaveBeenCalled();
    expect(mockedWithLock).toHaveBeenCalledTimes(1);
  });
});
