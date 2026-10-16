/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

import { createAppContextStartContractMock } from '../../../mocks';

import { FleetUnauthorizedError } from '../../../errors';

import { appContextService } from '../../app_context';

import { getInstalledPackageWithAssets } from './get';
import { installPackageWithStateMachine } from './install';
import { incrementVersionAndUpdate, updateCustomIntegration } from './update_custom_integration';

jest.mock('./get');
jest.mock('./install');
jest.mock('../../package_policy', () => {
  return {
    packagePolicyService: {
      listIds: jest.fn().mockResolvedValue({ items: [] }),
      bulkUpgrade: jest.fn().mockResolvedValue({}),
    },
  };
});

const mockGetInstalledPackageWithAssets = getInstalledPackageWithAssets as jest.MockedFunction<
  typeof getInstalledPackageWithAssets
>;

const mockInstallPackageWithStateMachine = installPackageWithStateMachine as jest.MockedFunction<
  typeof installPackageWithStateMachine
>;

describe('updateCustomIntegration', () => {
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  const savedObjectsClient = savedObjectsClientMock.create();
  const esClient = elasticsearchClientMock.createElasticsearchClient();

  beforeEach(() => {
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
    jest.clearAllMocks();

    savedObjectsClient.get.mockResolvedValue({
      id: 'test-integration',
      type: 'epm-packages',
      attributes: {
        name: 'test-integration',
        version: '1.0.0',
        title: 'Test Integration',
        description: 'Test integration description',
        install_source: 'custom',
      },
      references: [],
    });

    mockGetInstalledPackageWithAssets.mockResolvedValue({
      packageInfo: {
        name: 'test-integration',
        version: '1.0.0',
        title: 'Test Integration',
        description: 'Test integration description',
      },
      installation: {
        installed_es: [],
        installed_kb: [],
        install_version: '1.0.0',
        install_status: 'installed',
        install_started_at: '2025-04-15T00:00:00.000Z',
        install_source: 'custom',
      },
      assetsMap: new Map([
        [
          'test-integration-1.0.0/manifest.yml',
          Buffer.from('name: test-integration\nversion: 1.0.0'),
        ],
        ['test-integration-1.0.0/docs/README.md', Buffer.from('# Test Integration')],
        [
          'test-integration-1.0.0/changelog.yml',
          Buffer.from(
            '- version: 1.0.0\n  date: 2025-04-15\n  changes:\n    - type: added\n      description: Initial release\n      link: N/A'
          ),
        ],
      ]),
    } as any);

    mockInstallPackageWithStateMachine.mockResolvedValue({
      attributes: {
        name: 'test-integration',
        version: '1.0.1',
        title: 'Test Integration',
        description: 'Test integration description',
      },
      status: 'installed',
    } as any);
  });

  afterEach(() => {
    appContextService.stop();
  });

  it('should update custom integration with new version and readme', async () => {
    const result = await updateCustomIntegration(esClient, savedObjectsClient, 'test-integration', {
      readMeData: '# Updated Test Integration',
      categories: ['custom'],
    });

    // Verify the updated version
    expect(result).toEqual({
      version: '1.0.1',
      status: 'installed',
    });
    // Verify that getInstalledPackageWithAssets was called with correct params
    expect(mockGetInstalledPackageWithAssets).toHaveBeenCalledWith({
      savedObjectsClient,
      pkgName: 'test-integration',
    });

    // Verify that installPackageWithStateMachine was called with appropriate params
    expect(mockInstallPackageWithStateMachine).toHaveBeenCalledWith(
      expect.objectContaining({
        pkgName: 'test-integration',
        pkgVersion: '1.0.1',
        installSource: 'custom',
        installType: 'install',
        savedObjectsClient,
        esClient,
      })
    );
  });

  // This route replays the stored archive with force: true, so an integration that was
  // originally uploaded has its real transforms recreated here. Passing a request would bind
  // those caller-authored transforms to the editing user and start them, turning a README edit
  // into an alternate reauthorization path around the install-source gate.
  it('does not forward a request, so replayed transforms cannot be rebound to the editor', async () => {
    await updateCustomIntegration(esClient, savedObjectsClient, 'test-integration', {
      readMeData: '# Updated',
      categories: ['custom'],
    });

    expect(mockInstallPackageWithStateMachine).toHaveBeenCalledWith(
      expect.objectContaining({ installSource: 'custom', request: undefined })
    );
  });

  // Rejecting up front matters: the state machine would overwrite the installation saved object
  // before the transform step failed, and it resolves with { error } rather than throwing, so the
  // route would answer 200 over a damaged installation.
  it('refuses an archive containing transforms without touching the installation', async () => {
    mockGetInstalledPackageWithAssets.mockResolvedValueOnce({
      packageInfo: { name: 'test-integration', version: '1.0.0', title: 'Test Integration' },
      installation: { install_version: '1.0.0', install_source: 'upload', installed_es: [] },
      assetsMap: new Map([
        [
          'test-integration-1.0.0/manifest.yml',
          Buffer.from('name: test-integration\nversion: 1.0.0'),
        ],
        [
          'test-integration-1.0.0/elasticsearch/transform/probe/transform.yml',
          Buffer.from('source:\n  index: ["logs-*"]\ndest:\n  index: "d"\n'),
        ],
      ]),
    } as any);

    await expect(
      updateCustomIntegration(esClient, savedObjectsClient, 'test-integration', {
        readMeData: '# Updated',
        categories: ['custom'],
      })
    ).rejects.toThrow(FleetUnauthorizedError);

    expect(mockInstallPackageWithStateMachine).not.toHaveBeenCalled();
  });

  it('should increment version and update correctly', async () => {
    const result = await incrementVersionAndUpdate(
      savedObjectsClient,
      esClient,
      'test-integration',
      {
        readme: '# Updated Test Integration',
        version: '1.0.1',
        categories: ['custom'],
      }
    );
    expect(result).toEqual({
      attributes: {
        name: 'test-integration',
        version: '1.0.1',
        title: 'Test Integration',
        description: 'Test integration description',
      },
      status: 'installed',
    });
  });
  it('should throw an error when integration is not found', async () => {
    // Instead of returning null, mock the error that would be thrown by SavedObjectsClient
    savedObjectsClient.get.mockImplementationOnce(() => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(
        'epm-packages',
        'non-existent-integration'
      );
    });

    await expect(
      updateCustomIntegration(esClient, savedObjectsClient, 'non-existent-integration', {
        readMeData: '# Updated Test Integration',
      })
    ).rejects.toThrow('Integration with ID non-existent-integration not found');
  });

  it('should handle error during version update', async () => {
    const testError = new Error('Test error during update');
    mockGetInstalledPackageWithAssets.mockRejectedValueOnce(testError);

    await expect(
      updateCustomIntegration(esClient, savedObjectsClient, 'test-integration', {
        readMeData: '# Updated Test Integration',
      })
    ).rejects.toThrow('Test error during update');
  });

  it('should throw an error when integration is not a custom integration', async () => {
    savedObjectsClient.get.mockResolvedValue({
      id: 'test-integration',
      type: 'epm-packages',
      attributes: {
        name: 'test-integration',
        version: '1.0.0',
        title: 'Test Integration',
        description: 'Test integration description',
        install_source: 'other',
      },
      references: [],
    });

    await expect(
      updateCustomIntegration(esClient, savedObjectsClient, 'test-integration', {
        readMeData: '# Updated Test Integration',
      })
    ).rejects.toThrow('Integration with ID test-integration is not a custom integration');
  });
});
