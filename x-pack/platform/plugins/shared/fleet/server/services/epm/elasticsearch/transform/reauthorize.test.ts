/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { InstallSource } from '../../../../../common/types';
import { FleetUnauthorizedError } from '../../../../errors';
import { getInstallation } from '../../packages/get';

import { handleTransformReauthorizeAndStart } from './reauthorize';

jest.mock('../../packages/get', () => ({ getInstallation: jest.fn() }));
jest.mock('../../packages/es_assets_reference', () => ({
  updateEsAssetReferences: jest.fn().mockResolvedValue([]),
}));

const mockedGetInstallation = getInstallation as jest.MockedFunction<typeof getInstallation>;

describe('handleTransformReauthorizeAndStart - install source gate', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  const reauthorize = () =>
    handleTransformReauthorizeAndStart({
      esClient,
      savedObjectsClient,
      logger: loggerMock.create(),
      pkgName: 'my_package',
      pkgVersion: '1.0.0',
      transforms: [{ transformId: 'logs-my_package.probe-default-1.0.0' }],
      secondaryAuth: { headers: { 'es-secondary-authorization': 'ApiKey encoded-key' } },
      username: 'elastic',
    });

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchClientMock.createClusterClient().asInternalUser;
    esClient.transform.getTransform.mockResponse({ count: 0, transforms: [] });
    savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockResolvedValue({
      id: 'my_package',
      type: 'epm-packages',
      attributes: { installed_es: [] },
      references: [],
    } as any);
  });

  // Reauthorizing re-binds a transform to the caller, who must hold transform admin. Allowing
  // that for a caller-authored package would undo the identity binding applied at install time
  // and hand an uploaded transform privileges its uploader never had.
  it.each(['upload', 'custom'] as const)(
    'refuses to reauthorize a transform from a %s package',
    async (installSource: InstallSource) => {
      mockedGetInstallation.mockResolvedValue({ install_source: installSource } as any);

      await expect(reauthorize()).rejects.toThrow(FleetUnauthorizedError);
      expect(esClient.transform.updateTransform).not.toHaveBeenCalled();
      expect(esClient.transform.startTransform).not.toHaveBeenCalled();
    }
  );

  it('fails closed when the installation cannot be read', async () => {
    mockedGetInstallation.mockResolvedValue(undefined);

    await expect(reauthorize()).rejects.toThrow(FleetUnauthorizedError);
    expect(esClient.transform.updateTransform).not.toHaveBeenCalled();
  });

  it.each(['registry', 'bundled'] as const)(
    'allows reauthorizing a transform from a %s package',
    async (installSource: InstallSource) => {
      mockedGetInstallation.mockResolvedValue({ install_source: installSource } as any);

      await expect(reauthorize()).resolves.toEqual([]);
      expect(esClient.transform.getTransform).toHaveBeenCalled();
    }
  );
});
