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
  getDatasetName,
  removeAssetsForInputPackagePolicy,
} from '../../services/epm/packages/input_type_packages';

import { appContextService } from '../../services';

import { FleetNotFoundError } from '../../errors';

import { deletePackageDatastreamAssetsHandler } from './package_datastream_assets_handler';

jest.mock('../../services/epm/packages/get');
jest.mock('../../services/epm/packages/input_type_packages');

jest.mock('../../services/package_policy', () => {
  return {
    packagePolicyService: {
      get: jest.fn(),
    },
  };
});

const packagePolicyServiceMock = packagePolicyService as jest.Mocked<PackagePolicyClient>;
const mockedGetPackageInfo = getPackageInfo as jest.Mock<ReturnType<typeof getPackageInfo>>;
const mockedGetDatasetName = getDatasetName as jest.Mock<ReturnType<typeof getDatasetName>>;
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

describe('deletePackageDatastreamAssetsHandler', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let logger: MockedLogger;
  beforeAll(async () => {
    logger = loggerMock.create();
    appContextService.getLogger = () => logger;
  });

  beforeEach(() => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
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

  it('should remove assets', async () => {
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
        packagePolicyId: 'policy1',
      },
    });
    packagePolicyServiceMock.get.mockResolvedValue(testPackagePolicy);

    mockedGetDatasetName.mockReturnValue('custom');
    mockedFindDataStreamsFromDifferentPackages.mockResolvedValue({
      existingDataStreams: {},
      dataStream: {},
    } as any);
    mockedCheckExistingDataStreamsAreFromDifferentPackage.mockReturnValue(false);

    await deletePackageDatastreamAssetsHandler(context, request, response);
    expect(response.ok).toHaveBeenCalledWith({
      body: { success: true },
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

  it('should throw not found error if package is not an input type package', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      name: 'logs',
      version: '1.0.0',
      type: 'package',
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
    ).rejects.toThrowError(
      new FleetNotFoundError('Requested package test-1.0.0 is not an input package')
    );

    await expect(mockedRemoveAssetsForInputPackagePolicy).not.toHaveBeenCalled();
  });
});
