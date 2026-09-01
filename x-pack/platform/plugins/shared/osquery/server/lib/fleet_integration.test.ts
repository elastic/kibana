/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  ElasticsearchClient,
  SavedObjectsClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';

import { getInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import { getPackagePolicyDeleteCallback } from './fleet_integration';
import { OSQUERY_INTEGRATION_NAME } from '../../common';

jest.mock('../utils/get_internal_saved_object_client');

const getInternalSavedObjectsClientForSpaceIdMock =
  getInternalSavedObjectsClientForSpaceId as jest.MockedFunction<
    typeof getInternalSavedObjectsClientForSpaceId
  >;

const buildSoClient = (spaceId: string | undefined): SavedObjectsClientContract =>
  ({
    getCurrentNamespace: jest.fn().mockReturnValue(spaceId),
  } as unknown as SavedObjectsClientContract);

const buildDeletedPackagePolicy = (
  policyIds: string[],
  packageName: string = OSQUERY_INTEGRATION_NAME
) => ({
  id: 'package-policy-1',
  name: 'osquery-integration',
  namespace: 'default',
  description: '',
  package: { name: packageName, title: 'Osquery Manager', version: '1.0.0' },
  enabled: true,
  policy_id: policyIds[0],
  policy_ids: policyIds,
  inputs: [],
  revision: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  created_by: 'test-user',
  updated_at: '2024-01-01T00:00:00.000Z',
  updated_by: 'test-user',
  success: true,
});

describe('getPackagePolicyDeleteCallback', () => {
  const core = {} as CoreStart;
  let mockPacksClient: SavedObjectsClient;
  let mockEsClient: ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPacksClient = {
      find: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    } as unknown as SavedObjectsClient;

    // A single space-scoped client instance is returned; assertions below verify
    // that BOTH the pack `find` and the pack `update` use this same instance.
    getInternalSavedObjectsClientForSpaceIdMock.mockReturnValue(
      mockPacksClient as unknown as ReturnType<typeof getInternalSavedObjectsClientForSpaceId>
    );

    mockEsClient = {} as ElasticsearchClient;
  });

  it('looks packs up and updates them with the SAME client scoped to the current (custom) space', async () => {
    (mockPacksClient.find as jest.Mock).mockResolvedValue({
      saved_objects: [
        {
          id: 'pack-1',
          attributes: { shards: [{ key: 'policy-1', value: '100' }] },
          references: [
            { id: 'policy-1', name: 'Policy 1', type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE },
          ],
        },
      ],
    });

    const callback = getPackagePolicyDeleteCallback(core);
    await callback(
      [buildDeletedPackagePolicy(['policy-1'])],
      buildSoClient('custom-space'),
      mockEsClient
    );

    // Regression guard for the delete-path space-scoping fix (see
    // openspec/changes/fix-osquery-pack-delete-space-scope): cleanup must run in
    // the request's space, not the startup default space.
    expect(getInternalSavedObjectsClientForSpaceIdMock).toHaveBeenCalledTimes(1);
    expect(getInternalSavedObjectsClientForSpaceIdMock).toHaveBeenCalledWith(core, 'custom-space');

    // The pack lookup and update use the exact same space-scoped client instance.
    expect(mockPacksClient.find).toHaveBeenCalledTimes(1);
    expect(mockPacksClient.update).toHaveBeenCalledTimes(1);
  });

  it('uses an undefined space id (default space) when the request is in the default space', async () => {
    // In the default space Fleet's SO client returns `undefined` from
    // `getCurrentNamespace()`, which the callback forwards unchanged so the
    // client resolves to the default namespace.
    (mockPacksClient.find as jest.Mock).mockResolvedValue({
      saved_objects: [
        {
          id: 'pack-1',
          attributes: { shards: [{ key: 'policy-1', value: '100' }] },
          references: [
            { id: 'policy-1', name: 'Policy 1', type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE },
          ],
        },
      ],
    });

    const callback = getPackagePolicyDeleteCallback(core);
    await callback(
      [buildDeletedPackagePolicy(['policy-1'])],
      buildSoClient(undefined),
      mockEsClient
    );

    expect(getInternalSavedObjectsClientForSpaceIdMock).toHaveBeenCalledWith(core, undefined);
    expect(mockPacksClient.update).toHaveBeenCalledTimes(1);
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

    const callback = getPackagePolicyDeleteCallback(core);
    await callback(
      [buildDeletedPackagePolicy(['policy-2'])],
      buildSoClient('custom-space'),
      mockEsClient
    );

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

    const callback = getPackagePolicyDeleteCallback(core);
    await callback(
      [buildDeletedPackagePolicy(['policy-1'])],
      buildSoClient('custom-space'),
      mockEsClient
    );

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

    const callback = getPackagePolicyDeleteCallback(core);
    await callback(
      [buildDeletedPackagePolicy(['policy-1', 'policy-2'])],
      buildSoClient('custom-space'),
      mockEsClient
    );

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
    const callback = getPackagePolicyDeleteCallback(core);
    await callback(
      [buildDeletedPackagePolicy(['policy-1'], 'some-other-package')],
      buildSoClient('custom-space'),
      mockEsClient
    );

    expect(getInternalSavedObjectsClientForSpaceIdMock).not.toHaveBeenCalled();
    expect(mockPacksClient.find).not.toHaveBeenCalled();
    expect(mockPacksClient.update).not.toHaveBeenCalled();
  });
});
