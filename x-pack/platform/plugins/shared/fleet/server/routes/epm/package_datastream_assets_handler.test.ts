/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import { type MockedLogger, loggerMock } from '@kbn/logging-mocks';

import { getPackageInfo } from '../../services/epm/packages/get';
import type { FleetRequestHandlerContext, PackagePolicyClient } from '../..';
import { packagePolicyService } from '../../services/package_policy';

import { xpackMocks } from '../../mocks';

import {
  checkExistingDataStreamsAreFromDifferentPackage,
  findDataStreamsFromDifferentPackages,
  getCustomDatasetStreams,
  removeAssetsForInputPackagePolicy,
  isInputPackageDatasetUsedByMultiplePolicies,
} from '../../services/epm/packages/input_type_packages';

import { appContextService } from '../../services';

import { FleetNotFoundError } from '../../errors';
import { SO_SEARCH_LIMIT } from '../../constants';

import { deletePackageDatastreamAssetsHandler } from './package_datastream_assets_handler';

jest.mock('../../services/epm/packages/get');
jest.mock('../../services/epm/packages/input_type_packages');

jest.mock('../../services/package_policy', () => {
  return {
    packagePolicyService: {
      get: jest.fn(),
      list: jest.fn(),
    },
  };
});

const packagePolicyServiceMock = packagePolicyService as jest.Mocked<PackagePolicyClient>;
const mockedGetPackageInfo = getPackageInfo as jest.Mock<ReturnType<typeof getPackageInfo>>;
const mockedGetCustomDatasetStreams = getCustomDatasetStreams as jest.Mock<
  ReturnType<typeof getCustomDatasetStreams>
>;
const mockedFindDataStreamsFromDifferentPackages =
  findDataStreamsFromDifferentPackages as jest.Mock<
    ReturnType<typeof findDataStreamsFromDifferentPackages>
  >;
const mockedCheckExistingDataStreamsAreFromDifferentPackage =
  checkExistingDataStreamsAreFromDifferentPackage as jest.Mock<
    ReturnType<typeof checkExistingDataStreamsAreFromDifferentPackage>
  >;
const mockedRemoveAssetsForInputPackagePolicy = removeAssetsForInputPackagePolicy as jest.Mock<
  ReturnType<typeof removeAssetsForInputPackagePolicy>
>;
const mockedIsInputPackageDatasetUsedByMultiplePolicies =
  isInputPackageDatasetUsedByMultiplePolicies as jest.Mock<
    ReturnType<typeof isInputPackageDatasetUsedByMultiplePolicies>
  >;

describe('deletePackageDatastreamAssetsHandler', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let logger: MockedLogger;

  beforeAll(async () => {
    logger = loggerMock.create();
    appContextService.getLogger = () => logger;
    appContextService.getInternalUserSOClientWithoutSpaceExtension = jest.fn();
  });

  beforeEach(() => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
    jest.resetAllMocks();
  });
  const testPackagePolicy = {
    id: 'test-package-policy',
    name: 'Test policy',
    policy_ids: ['agent-policy'],
    description: 'Test policy description',
    namespace: 'default',
    inputs: [],
    package: {
      name: 'logs',
      title: 'Test',
      version: '1.0.0',
    },
  } as any;
  const packagePolicy1 = {
    id: 'policy1',
    name: 'Policy',
    policy_ids: ['agent-policy'],
    description: 'Policy description',
    namespace: 'default',
    inputs: [],
    package: {
      name: 'logs',
      title: 'Test',
      version: '1.0.0',
    },
  } as any;

  it('should remove assets', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      name: 'logs',
      version: '1.0.0',
      type: 'input',
      status: 'installed',
    } as any);
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'logs',
        pkgVersion: '1.0.0',
      },
      query: {
        packagePolicyId: 'policy1',
      },
    });
    packagePolicyServiceMock.get.mockResolvedValue(packagePolicy1);
    packagePolicyServiceMock.list.mockResolvedValue({
      items: [packagePolicy1, testPackagePolicy],
    } as any);

    mockedGetCustomDatasetStreams.mockReturnValue([
      { datasetName: 'custom', dataStreamType: 'logs', inputType: 'logfile' },
    ]);
    mockedFindDataStreamsFromDifferentPackages.mockResolvedValue({
      existingDataStreams: [],
      dataStream: {},
    } as any);
    mockedCheckExistingDataStreamsAreFromDifferentPackage.mockReturnValue(false);

    await deletePackageDatastreamAssetsHandler(context, request, response);
    expect(response.ok).toHaveBeenCalledWith({
      body: { success: true },
    });

    expect(packagePolicyServiceMock.list.mock.calls[0][1]).toMatchObject({
      perPage: SO_SEARCH_LIMIT,
    });

    await expect(mockedRemoveAssetsForInputPackagePolicy).toHaveBeenCalledWith({
      packageInfo: {
        name: 'logs',
        version: '1.0.0',
        type: 'input',
        status: 'installed',
      },
      logger: expect.anything(),
      datasetName: 'custom',
      esClient: expect.anything(),
      savedObjectsClient: expect.anything(),
    });
  });

  it('should throw not found error if the version in packageInfo not found', async () => {
    mockedGetPackageInfo.mockResolvedValue({} as any);
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'test',
        pkgVersion: '1.0.0',
      },
    });

    await expect(
      deletePackageDatastreamAssetsHandler(context, request, response)
    ).rejects.toThrowError(new FleetNotFoundError('Version is not installed'));

    await expect(mockedRemoveAssetsForInputPackagePolicy).not.toHaveBeenCalled();
  });

  it('should throw not found error if the version in packageInfo is different', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      name: 'logs',
      version: '1.1.0',
      type: 'input',
      status: 'installed',
    } as any);
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'test',
        pkgVersion: '1.0.0',
      },
    });

    await expect(
      deletePackageDatastreamAssetsHandler(context, request, response)
    ).rejects.toThrowError(new FleetNotFoundError('Version is not installed'));

    await expect(mockedRemoveAssetsForInputPackagePolicy).not.toHaveBeenCalled();
  });

  it('should remove assets for integration packages', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      name: 'logs',
      version: '1.0.0',
      type: 'integration',
      status: 'installed',
    } as any);
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'logs',
        pkgVersion: '1.0.0',
      },
      query: {
        packagePolicyId: 'policy1',
      },
    });
    packagePolicyServiceMock.get.mockResolvedValue(packagePolicy1);
    packagePolicyServiceMock.list.mockResolvedValue({
      items: [packagePolicy1, testPackagePolicy],
    } as any);

    mockedGetCustomDatasetStreams.mockReturnValue([
      { datasetName: 'custom', dataStreamType: 'logs', inputType: 'logfile' },
    ]);
    mockedFindDataStreamsFromDifferentPackages.mockResolvedValue({
      existingDataStreams: [],
      dataStream: {},
    } as any);
    mockedCheckExistingDataStreamsAreFromDifferentPackage.mockReturnValue(false);

    await deletePackageDatastreamAssetsHandler(context, request, response);
    expect(response.ok).toHaveBeenCalledWith({
      body: { success: true },
    });

    expect(mockedRemoveAssetsForInputPackagePolicy).toHaveBeenCalledWith({
      packageInfo: {
        name: 'logs',
        version: '1.0.0',
        type: 'integration',
        status: 'installed',
      },
      logger: expect.anything(),
      datasetName: 'custom',
      esClient: expect.anything(),
      savedObjectsClient: expect.anything(),
    });
  });

  it('should throw not found error if package policy id does not exist in request space', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      name: 'logs',
      version: '1.0.0',
      type: 'input',
      status: 'installed',
    } as any);
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'test',
        pkgVersion: '1.0.0',
      },
      query: {
        packagePolicyId: 'idontexist',
      },
    });
    packagePolicyServiceMock.get.mockResolvedValue(null);
    await expect(deletePackageDatastreamAssetsHandler(context, request, response)).rejects.toThrow(
      new FleetNotFoundError('Package policy with id idontexist not found')
    );
    expect(packagePolicyServiceMock.list).not.toHaveBeenCalled();
    await expect(mockedRemoveAssetsForInputPackagePolicy).not.toHaveBeenCalled();
  });

  it('should throw not found error if package policy belongs to a different package name', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      name: 'logs',
      version: '1.0.0',
      type: 'input',
      status: 'installed',
    } as any);
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'logs',
        pkgVersion: '1.0.0',
      },
      query: {
        packagePolicyId: 'policy-other-pkg',
      },
    });
    packagePolicyServiceMock.get.mockResolvedValue({
      ...packagePolicy1,
      id: 'policy-other-pkg',
      package: { name: 'nginx', title: 'Nginx', version: '1.0.0' },
    });
    await expect(deletePackageDatastreamAssetsHandler(context, request, response)).rejects.toThrow(
      new FleetNotFoundError('Package policy with id policy-other-pkg not found')
    );
    expect(packagePolicyServiceMock.list).not.toHaveBeenCalled();
    await expect(mockedRemoveAssetsForInputPackagePolicy).not.toHaveBeenCalled();
  });

  it('should throw not found error if package policy belongs to a different package version', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      name: 'logs',
      version: '1.0.0',
      type: 'input',
      status: 'installed',
    } as any);
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'logs',
        pkgVersion: '1.0.0',
      },
      query: {
        packagePolicyId: 'policy-other-version',
      },
    });
    packagePolicyServiceMock.get.mockResolvedValue({
      ...packagePolicy1,
      id: 'policy-other-version',
      package: { name: 'logs', title: 'Test', version: '2.0.0' },
    });
    await expect(deletePackageDatastreamAssetsHandler(context, request, response)).rejects.toThrow(
      new FleetNotFoundError('Package policy with id policy-other-version not found')
    );
    expect(packagePolicyServiceMock.list).not.toHaveBeenCalled();
    await expect(mockedRemoveAssetsForInputPackagePolicy).not.toHaveBeenCalled();
  });

  it('should throw not found error if package policy belongs to a different space', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      name: 'logs',
      version: '1.0.0',
      type: 'input',
      status: 'installed',
    } as any);
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'logs',
        pkgVersion: '1.0.0',
      },
      query: {
        packagePolicyId: 'other-space-policy-id',
      },
    });
    // Space-scoped get returns null — policy not visible in request space
    packagePolicyServiceMock.get.mockResolvedValue(null);
    await expect(deletePackageDatastreamAssetsHandler(context, request, response)).rejects.toThrow(
      new FleetNotFoundError('Package policy with id other-space-policy-id not found')
    );
    expect(packagePolicyServiceMock.list).not.toHaveBeenCalled();
    expect(mockedRemoveAssetsForInputPackagePolicy).not.toHaveBeenCalled();
  });

  it('should throw error if the datastreams also exist on different packages', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      name: 'logs',
      version: '1.0.0',
      type: 'input',
      status: 'installed',
    } as any);
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'logs',
        pkgVersion: '1.0.0',
      },
      query: {
        packagePolicyId: 'policy1',
      },
    });
    packagePolicyServiceMock.get.mockResolvedValue(packagePolicy1);
    packagePolicyServiceMock.list.mockResolvedValue({
      items: [testPackagePolicy, packagePolicy1],
    } as any);

    mockedGetCustomDatasetStreams.mockReturnValue([
      { datasetName: 'custom', dataStreamType: 'logs', inputType: 'logfile' },
    ]);
    mockedFindDataStreamsFromDifferentPackages.mockResolvedValue({
      existingDataStreams: [
        { name: 'datastream1', _meta: { package: { name: 'integration-test' } } },
      ],
      dataStream: {},
    } as any);
    mockedCheckExistingDataStreamsAreFromDifferentPackage.mockReturnValue(true);

    await expect(
      deletePackageDatastreamAssetsHandler(context, request, response)
    ).rejects.toThrowError(
      `Datastreams matching custom exist on other packages and cannot be removed`
    );
    await expect(mockedRemoveAssetsForInputPackagePolicy).not.toHaveBeenCalled();
  });

  it('should throw error if the datastreams exist on other package policies on different namespaces', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      name: 'logs',
      version: '1.0.0',
      type: 'input',
      status: 'installed',
    } as any);
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'logs',
        pkgVersion: '1.0.0',
      },
      query: {
        packagePolicyId: 'policy1',
      },
    });
    packagePolicyServiceMock.get.mockResolvedValue(packagePolicy1);
    packagePolicyServiceMock.list.mockResolvedValue({
      items: [
        packagePolicy1,
        testPackagePolicy,
        {
          ...testPackagePolicy,
          id: 'namespace-new',
          namespace: 'new',
          inputs: [{ streams: { vars: { 'datastream.dataset': { value: 'custom' } } } }],
        },
      ],
    } as any);

    mockedGetCustomDatasetStreams.mockReturnValue([
      { datasetName: 'custom', dataStreamType: 'logs', inputType: 'logfile' },
    ]);
    mockedFindDataStreamsFromDifferentPackages.mockResolvedValue({
      existingDataStreams: [],
      dataStream: {},
    } as any);
    mockedIsInputPackageDatasetUsedByMultiplePolicies.mockReturnValue(true);

    await expect(
      deletePackageDatastreamAssetsHandler(context, request, response)
    ).rejects.toThrowError(
      `Datastreams matching custom are in use by other package policies and cannot be removed`
    );
    await expect(mockedRemoveAssetsForInputPackagePolicy).not.toHaveBeenCalled();
  });
});
