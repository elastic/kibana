/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';

import { appContextService } from '../../app_context';
import { PackageNotFoundError } from '../../../errors';

import { dataStreamService } from '../../data_streams';

import { getInstalledPackageWithAssets, getInstallation } from './get';
import { optimisticallyAddEsAssetReferences } from './es_assets_reference';
import {
  installAssetsForInputPackagePolicy,
  removeAssetsForInputPackagePolicy,
} from './input_type_packages';
import { cleanupAssets } from './remove';

jest.mock('../../data_streams');
jest.mock('./get');
jest.mock('./install_index_template_pipeline');
jest.mock('./es_assets_reference');
jest.mock('./remove');

const cleanupAssetsMock = cleanupAssets as jest.MockedFunction<typeof cleanupAssets>;

jest.mock('../../app_context', () => {
  const logger = { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), info: jest.fn() };
  const mockedSavedObjectTagging = {
    createInternalAssignmentService: jest.fn(),
    createTagClient: jest.fn(),
  };

  return {
    appContextService: {
      getLogger: jest.fn(() => {
        return logger;
      }),
      getTelemetryEventsSender: jest.fn(),
      getSavedObjects: jest.fn(() => ({
        createImporter: jest.fn(),
      })),
      getConfig: jest.fn(() => ({})),
      getSavedObjectsTagging: jest.fn(() => mockedSavedObjectTagging),
      getInternalUserSOClientForSpaceId: jest.fn(),
      getExperimentalFeatures: jest.fn(),
    },
  };
});

describe('installAssetsForInputPackagePolicy', () => {
  beforeEach(() => {
    jest.mocked(optimisticallyAddEsAssetReferences).mockReset();
  });

  it('should do nothing for non input package', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    await installAssetsForInputPackagePolicy({
      pkgInfo: {
        type: 'integration',
      } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: false,
      logger: mockedLogger,
      packagePolicy: {} as any,
    });
    expect(jest.mocked(optimisticallyAddEsAssetReferences)).not.toBeCalled();
  });

  const TEST_PKG_INFO_INPUT = {
    type: 'input',
    name: 'test',
    version: '1.0.0',
    policy_templates: [
      {
        name: 'log',
        type: 'log',
      },
    ],
  };

  it('should throw for input package if package is not installed', async () => {
    jest.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue(undefined);
    const mockedLogger = jest.mocked(appContextService.getLogger());

    await expect(() =>
      installAssetsForInputPackagePolicy({
        pkgInfo: TEST_PKG_INFO_INPUT as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [{ type: 'log', streams: [{ type: 'log', vars: { dataset: 'test.tata' } }] }],
        } as any,
      })
    ).rejects.toThrowError(PackageNotFoundError);
  });

  it('should install es index patterns for input package if package is installed', async () => {
    jest.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);

    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'test',
        version: '1.0.0',
      },
      packageInfo: TEST_PKG_INFO_INPUT,
      assetsMap: new Map(),
      paths: [],
    } as any);
    const mockedLogger = jest.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: TEST_PKG_INFO_INPUT as any,

      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: false,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'log',
            type: 'log',
            streams: [{ type: 'log', vars: { 'data_stream.dataset': { value: 'test.tata' } } }],
          },
        ],
      } as any,
    });

    expect(jest.mocked(optimisticallyAddEsAssetReferences)).toBeCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      {
        'test.tata': 'log-test.tata-*',
      }
    );
  });
});

describe('removeAssetsForInputPackagePolicy', () => {
  beforeEach(() => {
    jest.mocked(cleanupAssetsMock).mockReset();
  });

  it('should do nothing for non input package', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    await removeAssetsForInputPackagePolicy({
      packageInfo: {
        type: 'integration',
      } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      logger: mockedLogger,
    });
    expect(cleanupAssetsMock).not.toBeCalled();
  });

  it('should do nothing for input packages with status !== than installed', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    await removeAssetsForInputPackagePolicy({
      packageInfo: {
        type: 'input',
        status: 'not_installed',
      } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      logger: mockedLogger,
    });
    expect(cleanupAssetsMock).not.toBeCalled();
  });

  it('should clean up assets for input packages with status = installed', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    jest.mocked(getInstallation).mockResolvedValue({
      name: 'logs',
      version: '1.0.0',
    } as any);

    await removeAssetsForInputPackagePolicy({
      packageInfo: {
        type: 'input',
        status: 'installed',
        name: 'logs',
        version: '1.0.0',
      } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      logger: mockedLogger,
    });
    expect(cleanupAssetsMock).toBeCalledWith(
      { name: 'logs', version: '1.0.0' },
      expect.anything(),
      expect.anything()
    );
  });

  it('should not clean up assets for input packages with status not installed', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    jest.mocked(getInstallation).mockResolvedValue(undefined);

    await removeAssetsForInputPackagePolicy({
      packageInfo: {
        type: 'input',
        status: 'installed',
        name: 'logs',
        version: '1.0.0',
      } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      logger: mockedLogger,
    });
    expect(cleanupAssetsMock).not.toBeCalled();
  });

  it('should log error if cleanupAssets failed', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    jest.mocked(getInstallation).mockResolvedValue({
      name: 'logs',
      version: '1.0.0',
    } as any);

    cleanupAssetsMock.mockRejectedValueOnce('error');

    await removeAssetsForInputPackagePolicy({
      packageInfo: {
        type: 'input',
        status: 'installed',
        name: 'logs',
        version: '1.0.0',
      } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      logger: mockedLogger,
    });
    expect(mockedLogger.error).toBeCalled();
  });
});
