/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClient } from '@kbn/core/server';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { updateGlobalPacksCreateCallback } from './update_global_packs';
import type { OsqueryAppContextService } from './osquery_app_context_services';
import type { PackSavedObject } from '../common/types';

describe('updateGlobalPacksCreateCallback', () => {
  let mockPacksClient: SavedObjectsClient;
  let mockOsqueryContext: OsqueryAppContextService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPacksClient = {
      update: jest.fn().mockResolvedValue({}),
    } as unknown as SavedObjectsClient;

    mockOsqueryContext = {
      getAgentPolicyService: jest.fn().mockReturnValue({
        getByIds: jest.fn().mockResolvedValue([
          { id: 'policy-1', name: 'Policy 1' },
          { id: 'policy-2', name: 'Policy 2' },
        ]),
      }),
    } as unknown as OsqueryAppContextService;
  });

  it('should preserve existing policy references when adding new policy to global pack', async () => {
    const existingPackWithReferences: PackSavedObject = {
      name: 'global-pack',
      description: 'A global pack',
      enabled: true,
      queries: [
        {
          id: 'query1',
          name: 'query1',
          query: 'SELECT * FROM processes;',
          interval: 3600,
        },
      ],
      shards: [{ key: '*', value: 100 }],
      saved_object_id: 'pack-so-id',
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: 'test-user',
      updated_at: '2024-01-01T00:00:00.000Z',
      updated_by: 'test-user',
      references: [
        {
          id: 'policy-1',
          name: 'Policy 1',
          type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
        },
      ],
    };

    const newPackagePolicy: NewPackagePolicy = {
      name: 'osquery-integration',
      namespace: 'default',
      description: '',
      package: { name: 'osquery_manager', title: 'Osquery Manager', version: '1.0.0' },
      enabled: true,
      policy_ids: ['policy-2'],
      inputs: [],
    };

    await updateGlobalPacksCreateCallback(
      newPackagePolicy,
      mockPacksClient,
      [existingPackWithReferences],
      mockOsqueryContext
    );

    expect(mockPacksClient.update).toHaveBeenCalledWith(
      'osquery-pack',
      'pack-so-id',
      {},
      {
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
        ],
      }
    );
  });

  it('should add first policy reference to global pack with no existing references', async () => {
    const globalPackWithoutReferences: PackSavedObject = {
      name: 'new-global-pack',
      description: 'A new global pack',
      enabled: true,
      queries: [
        {
          id: 'query1',
          name: 'query1',
          query: 'SELECT * FROM users;',
          interval: 7200,
        },
      ],
      shards: [{ key: '*', value: 100 }],
      saved_object_id: 'pack-so-id-2',
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: 'test-user',
      updated_at: '2024-01-01T00:00:00.000Z',
      updated_by: 'test-user',
      references: [],
    };

    const newPackagePolicy: NewPackagePolicy = {
      name: 'osquery-integration',
      namespace: 'default',
      description: '',
      package: { name: 'osquery_manager', title: 'Osquery Manager', version: '1.0.0' },
      enabled: true,
      policy_ids: ['policy-1'],
      inputs: [],
    };

    await updateGlobalPacksCreateCallback(
      newPackagePolicy,
      mockPacksClient,
      [globalPackWithoutReferences],
      mockOsqueryContext
    );

    expect(mockPacksClient.update).toHaveBeenCalledWith(
      'osquery-pack',
      'pack-so-id-2',
      {},
      {
        references: [
          {
            id: 'policy-1',
            name: 'Policy 1',
            type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
          },
        ],
      }
    );
  });

  it('should not modify non-global packs', async () => {
    const nonGlobalPack: PackSavedObject = {
      name: 'specific-pack',
      description: 'A pack for specific policies',
      enabled: true,
      queries: [
        {
          id: 'query1',
          name: 'query1',
          query: 'SELECT * FROM processes;',
          interval: 3600,
        },
      ],
      shards: [{ key: 'policy-1', value: 100 }],
      saved_object_id: 'pack-so-id-3',
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: 'test-user',
      updated_at: '2024-01-01T00:00:00.000Z',
      updated_by: 'test-user',
      references: [
        {
          id: 'policy-1',
          name: 'Policy 1',
          type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
        },
      ],
    };

    const newPackagePolicy: NewPackagePolicy = {
      name: 'osquery-integration',
      namespace: 'default',
      description: '',
      package: { name: 'osquery_manager', title: 'Osquery Manager', version: '1.0.0' },
      enabled: true,
      policy_ids: ['policy-2'],
      inputs: [],
    };

    const result = await updateGlobalPacksCreateCallback(
      newPackagePolicy,
      mockPacksClient,
      [nonGlobalPack],
      mockOsqueryContext
    );

    expect(mockPacksClient.update).not.toHaveBeenCalled();
    expect(result).toEqual(newPackagePolicy);
  });

  it('should embed pack configuration in package policy config', async () => {
    const globalPack: PackSavedObject = {
      name: 'embedded-pack',
      description: 'Pack to be embedded',
      enabled: true,
      queries: [
        {
          id: 'query1',
          name: 'test-query',
          query: 'SELECT * FROM listening_ports;',
          interval: 1800,
        },
      ],
      shards: [{ key: '*', value: 100 }],
      saved_object_id: 'pack-so-id-4',
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: 'test-user',
      updated_at: '2024-01-01T00:00:00.000Z',
      updated_by: 'test-user',
      references: [],
    };

    const newPackagePolicy: NewPackagePolicy = {
      name: 'osquery-integration',
      namespace: 'default',
      description: '',
      package: { name: 'osquery_manager', title: 'Osquery Manager', version: '1.0.0' },
      enabled: true,
      policy_ids: ['policy-1'],
      inputs: [],
    };

    const result = await updateGlobalPacksCreateCallback(
      newPackagePolicy,
      mockPacksClient,
      [globalPack],
      mockOsqueryContext
    );

    expect(result.inputs[0].config?.osquery?.value?.packs?.['embedded-pack']).toEqual({
      shard: 100,
      queries: {
        query1: {
          name: 'test-query',
          query: 'SELECT * FROM listening_ports;',
          interval: 1800,
        },
      },
    });
  });
});
