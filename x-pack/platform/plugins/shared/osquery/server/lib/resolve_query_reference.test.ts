/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { resolveQueryReference } from './resolve_query_reference';
import { packSavedObjectType, savedQuerySavedObjectType } from '../../common/types';

const SAVED_QUERY_ID = 'saved-query-1';
const PACK_ID = 'pack-1';

describe('resolveQueryReference', () => {
  /**
   * Seeds saved objects per space so cross-space isolation can be asserted: a lookup made
   * while scoped to space A must not see an object that only exists in space B.
   */
  const createMockCoreStart = (
    objectsBySpace: Record<string, Record<string, object>>
  ): CoreStart => {
    const getScopedClient = jest.fn((request: { headers: unknown }) => {
      // getInternalSavedObjectsClientForSpaceId brands the space onto the fake request.
      const spaceId = (request as unknown as { spaceId?: string }).spaceId ?? 'default';
      const objects = objectsBySpace[spaceId] ?? {};

      return {
        get: jest.fn(async (type: string, id: string) => {
          const found = objects[id];

          if (!found) {
            throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
          }

          return { id, type, attributes: found, references: [] };
        }),
      };
    });

    return { savedObjects: { getScopedClient } } as unknown as CoreStart;
  };

  it('should resolve a saved query in the active space', async () => {
    const coreStart = createMockCoreStart({
      default: { [SAVED_QUERY_ID]: { query: 'select 1;' } },
    });

    await expect(
      resolveQueryReference(coreStart, 'default', { saved_query_id: SAVED_QUERY_ID })
    ).resolves.toEqual({ query: 'select 1;' });
  });

  it('should include stored ecs_mapping in record form', async () => {
    const coreStart = createMockCoreStart({
      default: {
        [SAVED_QUERY_ID]: {
          query: 'select 1;',
          ecs_mapping: [{ key: 'host.name', value: { field: 'name' } }],
        },
      },
    });

    await expect(
      resolveQueryReference(coreStart, 'default', { saved_query_id: SAVED_QUERY_ID })
    ).resolves.toEqual({
      query: 'select 1;',
      ecs_mapping: { 'host.name': { field: 'name' } },
    });
  });

  it('should resolve a pack to its stored queries', async () => {
    const coreStart = createMockCoreStart({
      default: {
        [PACK_ID]: { queries: [{ query: 'select 1;' }, { query: 'select 2;' }] },
      },
    });

    await expect(
      resolveQueryReference(coreStart, 'default', { pack_id: PACK_ID })
    ).resolves.toEqual({ queries: ['select 1;', 'select 2;'] });
  });

  it('should return undefined for a reference that does not exist', async () => {
    const coreStart = createMockCoreStart({ default: {} });

    await expect(
      resolveQueryReference(coreStart, 'default', { saved_query_id: 'missing' })
    ).resolves.toBeUndefined();
  });

  it('should return undefined when no reference is supplied', async () => {
    const coreStart = createMockCoreStart({ default: {} });

    await expect(resolveQueryReference(coreStart, 'default', {})).resolves.toBeUndefined();
    expect(coreStart.savedObjects.getScopedClient).not.toHaveBeenCalled();
  });

  it.each([' ', '', '   '])(
    'should treat a blank saved_query_id (%p) as no reference',
    async (savedQueryId) => {
      const coreStart = createMockCoreStart({ default: {} });

      await expect(
        resolveQueryReference(coreStart, 'default', { saved_query_id: savedQueryId })
      ).resolves.toBeUndefined();
      expect(coreStart.savedObjects.getScopedClient).not.toHaveBeenCalled();
    }
  );

  it('should not resolve a reference that only exists in another space', async () => {
    const coreStart = createMockCoreStart({
      other: { [SAVED_QUERY_ID]: { query: 'select 1;' } },
    });

    await expect(
      resolveQueryReference(coreStart, 'default', { saved_query_id: SAVED_QUERY_ID })
    ).resolves.toBeUndefined();
  });

  it('should resolve the same reference when scoped to the space that owns it', async () => {
    const coreStart = createMockCoreStart({
      other: { [SAVED_QUERY_ID]: { query: 'select 1;' } },
    });

    await expect(
      resolveQueryReference(coreStart, 'other', { saved_query_id: SAVED_QUERY_ID })
    ).resolves.toEqual({ query: 'select 1;' });
  });

  it('should prefer pack_id when both references are supplied', async () => {
    const coreStart = createMockCoreStart({
      default: {
        [SAVED_QUERY_ID]: { query: 'select 1;' },
        [PACK_ID]: { queries: [{ query: 'select 2;' }] },
      },
    });

    await expect(
      resolveQueryReference(coreStart, 'default', {
        saved_query_id: SAVED_QUERY_ID,
        pack_id: PACK_ID,
      })
    ).resolves.toEqual({ queries: ['select 2;'] });
  });

  it('should look references up as their expected saved object types', async () => {
    const coreStart = createMockCoreStart({
      default: { [SAVED_QUERY_ID]: { query: 'select 1;' }, [PACK_ID]: { queries: [] } },
    });

    await resolveQueryReference(coreStart, 'default', { saved_query_id: SAVED_QUERY_ID });
    const savedQueryClient = (coreStart.savedObjects.getScopedClient as jest.Mock).mock.results[0]
      .value;
    expect(savedQueryClient.get).toHaveBeenCalledWith(savedQuerySavedObjectType, SAVED_QUERY_ID);

    await resolveQueryReference(coreStart, 'default', { pack_id: PACK_ID });
    const packClient = (coreStart.savedObjects.getScopedClient as jest.Mock).mock.results[1].value;
    expect(packClient.get).toHaveBeenCalledWith(packSavedObjectType, PACK_ID);
  });

  it('should propagate non-404 saved object errors', async () => {
    const coreStart = {
      savedObjects: {
        getScopedClient: jest.fn().mockReturnValue({
          get: jest.fn().mockRejectedValue(new Error('elasticsearch unavailable')),
        }),
      },
    } as unknown as CoreStart;

    await expect(
      resolveQueryReference(coreStart, 'default', { saved_query_id: SAVED_QUERY_ID })
    ).rejects.toThrow('elasticsearch unavailable');
  });
});
