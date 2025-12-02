/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { getPackagePolicyDeleteCallback } from './fleet_integration';
import { OSQUERY_INTEGRATION_NAME } from '../../common';

describe('getPackagePolicyDeleteCallback', () => {
  let mockPacksClient: SavedObjectsClient;
  let mockSoClient: SavedObjectsClientContract;
  let mockEsClient: ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPacksClient = {
      find: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    } as unknown as SavedObjectsClient;

    mockSoClient = {} as SavedObjectsClientContract;
    mockEsClient = {} as ElasticsearchClient;
  });

  it('should remove only deleted policy references and keep remaining ones', async () => {
    (mockPacksClient.find as jest.Mock).mockResolvedValue({
      saved_objects: [
        {
          id: 'pack-1',
          attributes: {
            shards: [
              { key: 'policy-1', value: '100' },
              { key: 'policy-2', value: '100' },
              { key: 'policy-3', value: '100' },
            ],
          },
          references: [
            {
              id: 'policy-1',
              name: 'Policy 1',
              type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
            },
            {
              id: 'policy-2',
              name: 'Policy 2',
              type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
            },
            {
              id: 'policy-3',
              name: 'Policy 3',
              type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
            },
          ],
        },
      ],
    });

    const deletedPackagePolicy = {
      id: 'package-policy-1',
      name: 'osquery-integration',
      namespace: 'default',
      description: '',
      package: { name: OSQUERY_INTEGRATION_NAME, title: 'Osquery Manager', version: '1.0.0' },
      enabled: true,
      policy_id: 'policy-2',
      policy_ids: ['policy-2'],
      inputs: [],
      revision: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: 'test-user',
      updated_at: '2024-01-01T00:00:00.000Z',
      updated_by: 'test-user',
      success: true,
    };

    const callback = getPackagePolicyDeleteCallback(mockPacksClient);
    await callback([deletedPackagePolicy], mockSoClient, mockEsClient);

    expect(mockPacksClient.update).toHaveBeenCalledWith(
      'osquery-pack',
      'pack-1',
      {
        shards: [
          { key: 'policy-1', value: '100' },
          { key: 'policy-3', value: '100' },
        ],
      },
      {
        references: [
          {
            id: 'policy-1',
            name: 'Policy 1',
            type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
          },
          {
            id: 'policy-3',
            name: 'Policy 3',
            type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
          },
        ],
      }
    );
  });

  it('should remove all references when deleting the last policy', async () => {
    (mockPacksClient.find as jest.Mock).mockResolvedValue({
      saved_objects: [
        {
          id: 'pack-1',
          attributes: {
            shards: [{ key: 'policy-1', value: '100' }],
          },
          references: [
            {
              id: 'policy-1',
              name: 'Policy 1',
              type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
            },
          ],
        },
      ],
    });

    const deletedPackagePolicy = {
      id: 'package-policy-1',
      name: 'osquery-integration',
      namespace: 'default',
      description: '',
      package: { name: OSQUERY_INTEGRATION_NAME, title: 'Osquery Manager', version: '1.0.0' },
      enabled: true,
      policy_id: 'policy-1',
      policy_ids: ['policy-1'],
      inputs: [],
      revision: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: 'test-user',
      updated_at: '2024-01-01T00:00:00.000Z',
      updated_by: 'test-user',
      success: true,
    };

    const callback = getPackagePolicyDeleteCallback(mockPacksClient);
    await callback([deletedPackagePolicy], mockSoClient, mockEsClient);

    expect(mockPacksClient.update).toHaveBeenCalledWith(
      'osquery-pack',
      'pack-1',
      {
        shards: [],
      },
      {
        references: [],
      }
    );
  });

  it('should handle deletion of multiple policies at once', async () => {
    (mockPacksClient.find as jest.Mock).mockResolvedValue({
      saved_objects: [
        {
          id: 'pack-1',
          attributes: {
            shards: [
              { key: 'policy-1', value: '100' },
              { key: 'policy-2', value: '100' },
              { key: 'policy-3', value: '100' },
            ],
          },
          references: [
            {
              id: 'policy-1',
              name: 'Policy 1',
              type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
            },
            {
              id: 'policy-2',
              name: 'Policy 2',
              type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
            },
            {
              id: 'policy-3',
              name: 'Policy 3',
              type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
            },
          ],
        },
      ],
    });

    const deletedPackagePolicy = {
      id: 'package-policy-1',
      name: 'osquery-integration',
      namespace: 'default',
      description: '',
      package: { name: OSQUERY_INTEGRATION_NAME, title: 'Osquery Manager', version: '1.0.0' },
      enabled: true,
      policy_id: 'policy-1',
      policy_ids: ['policy-1', 'policy-2'],
      inputs: [],
      revision: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: 'test-user',
      updated_at: '2024-01-01T00:00:00.000Z',
      updated_by: 'test-user',
      success: true,
    };

    const callback = getPackagePolicyDeleteCallback(mockPacksClient);
    await callback([deletedPackagePolicy], mockSoClient, mockEsClient);

    expect(mockPacksClient.update).toHaveBeenCalledWith(
      'osquery-pack',
      'pack-1',
      {
        shards: [{ key: 'policy-3', value: '100' }],
      },
      {
        references: [
          {
            id: 'policy-3',
            name: 'Policy 3',
            type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
          },
        ],
      }
    );
  });

  it('should ignore non-osquery package deletions', async () => {
    const deletedPackagePolicy = {
      id: 'package-policy-1',
      name: 'some-other-integration',
      namespace: 'default',
      description: '',
      package: { name: 'some-other-package', title: 'Other Package', version: '1.0.0' },
      enabled: true,
      policy_id: 'policy-1',
      policy_ids: ['policy-1'],
      inputs: [],
      revision: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: 'test-user',
      updated_at: '2024-01-01T00:00:00.000Z',
      updated_by: 'test-user',
      success: true,
    };

    const callback = getPackagePolicyDeleteCallback(mockPacksClient);
    await callback([deletedPackagePolicy], mockSoClient, mockEsClient);

    expect(mockPacksClient.find).not.toHaveBeenCalled();
    expect(mockPacksClient.update).not.toHaveBeenCalled();
  });
});
