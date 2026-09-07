/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import {
  convertECSMappingToArray,
  convertECSMappingToObject,
  convertShardsToArray,
  convertShardsToObject,
  fetchOsqueryPackagePolicyIds,
} from './utils';

const createIdIterable = (batches: string[][]) => ({
  async *[Symbol.asyncIterator]() {
    for (const batch of batches) {
      yield batch;
    }
  },
});

describe('routes utils', () => {
  describe('convertECSMappingToArray', () => {
    it('converts ECS mapping object to array', () => {
      const ecsMapping = {
        host: { field: { name: 'host.name' } },
        user: { field: { name: 'user.name' } },
      };

      expect(convertECSMappingToArray(ecsMapping)).toEqual([
        { key: 'host', value: { field: { name: 'host.name' } } },
        { key: 'user', value: { field: { name: 'user.name' } } },
      ]);
    });

    it('returns undefined when ecsMapping is undefined', () => {
      expect(convertECSMappingToArray(undefined)).toBeUndefined();
    });
  });

  describe('convertECSMappingToObject', () => {
    it('converts ECS mapping array to object', () => {
      const ecsMapping = [
        { key: 'host', value: { field: { name: 'host.name' } } },
        { key: 'user', value: { field: { name: 'user.name' } } },
      ];

      expect(convertECSMappingToObject(ecsMapping)).toEqual({
        host: { field: { name: 'host.name' } },
        user: { field: { name: 'user.name' } },
      });
    });
  });

  describe('convertShardsToArray', () => {
    it('converts shards object to array', () => {
      const shards = { total: 10, failed: 1 };

      expect(convertShardsToArray(shards)).toEqual([
        { key: 'total', value: 10 },
        { key: 'failed', value: 1 },
      ]);
    });
  });

  describe('convertShardsToObject', () => {
    it('converts shards array to object', () => {
      const shards = [
        { key: 'total', value: 10 },
        { key: 'failed', value: 1 },
      ];

      expect(convertShardsToObject(shards)).toEqual({ total: 10, failed: 1 });
    });
  });

  describe('fetchOsqueryPackagePolicyIds', () => {
    const mockSoClient = {} as SavedObjectsClientContract;
    const mockLogger = {
      debug: jest.fn(),
    };
    const mockLogFactory = {
      get: jest.fn().mockReturnValue(mockLogger),
    };

    const createMockContext = (packagePolicyService?: { fetchAllItemIds: jest.Mock }) =>
      ({
        logFactory: mockLogFactory,
        service: {
          getPackagePolicyService: jest.fn().mockReturnValue(packagePolicyService),
        },
      } as unknown as OsqueryAppContext);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns all osquery package policy ids', async () => {
      const fetchAllItemIds = jest
        .fn()
        .mockResolvedValue(createIdIterable([['policy-1'], ['policy-2', 'policy-3']]));
      const mockContext = createMockContext({ fetchAllItemIds });

      const ids = await fetchOsqueryPackagePolicyIds(mockSoClient, mockContext);

      expect(fetchAllItemIds).toHaveBeenCalledWith(mockSoClient, {
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
      });
      expect(ids).toEqual(['policy-1', 'policy-2', 'policy-3']);
    });

    it('throws when package policy service is unavailable', async () => {
      const mockContext = createMockContext();

      await expect(fetchOsqueryPackagePolicyIds(mockSoClient, mockContext)).rejects.toThrow(
        'Package policy service is not available'
      );
    });
  });
});
