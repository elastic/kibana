/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isOsqueryResponseActionAuthorized } from './check_response_action_authz';
import { packSavedObjectType, savedQuerySavedObjectType } from '../../common/types';

const SAVED_QUERY_ID = 'test-saved-query-id';
const PACK_ID = 'test-pack-id';
const STORED_QUERY = 'select 1 from uptime;';
const STORED_PACK_QUERY = 'select * from processes;';

describe('isOsqueryResponseActionAuthorized', () => {
  let request: KibanaRequest;

  /**
   * Builds a CoreStart whose internal saved objects client resolves only the ids seeded
   * here, so an unresolvable reference behaves like it does in production (404).
   */
  const createMockCoreStart = (
    capabilities: Record<string, boolean>,
    savedObjects: Record<
      string,
      {
        query?: string;
        queries?: Array<{ query: string }>;
        ecs_mapping?: Array<{ key: string; value: Record<string, unknown> }>;
      }
    > = {}
  ): CoreStart => {
    const get = jest.fn(async (type: string, id: string) => {
      const found = savedObjects[id];

      if (!found) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }

      return { id, type, attributes: found, references: [] };
    });

    return {
      capabilities: {
        resolveCapabilities: jest.fn().mockResolvedValue({ osquery: capabilities }),
      },
      savedObjects: {
        getScopedClient: jest.fn().mockReturnValue({ get }),
      },
    } as unknown as CoreStart;
  };

  const withSavedQuery = (capabilities: Record<string, boolean>) =>
    createMockCoreStart(capabilities, {
      [SAVED_QUERY_ID]: { query: STORED_QUERY },
      [PACK_ID]: { queries: [{ query: STORED_PACK_QUERY }] },
    });

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
  });

  describe('writeLiveQueries', () => {
    it('should authorize an arbitrary query', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: true, runSavedQueries: false });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, { query: 'select 1;' })
      ).resolves.toBe(true);
    });

    it('should authorize regardless of the saved_query_id supplied', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: true, runSavedQueries: false });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, {
          saved_query_id: 'does-not-exist',
          query: 'select 1;',
        })
      ).resolves.toBe(true);
    });

    it('should authorize an arbitrary queries array', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: true, runSavedQueries: false });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, {
          queries: [{ query: 'select 1;' }, { query: 'select 2;' }],
        })
      ).resolves.toBe(true);
    });
  });

  describe('no privileges', () => {
    it('should reject a direct query', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: false });

      await expect(isOsqueryResponseActionAuthorized(coreStart, request, {})).resolves.toBe(false);
    });

    it('should reject even with a resolvable saved_query_id', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: false });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, { saved_query_id: SAVED_QUERY_ID })
      ).resolves.toBe(false);
    });
  });

  describe('runSavedQueries only', () => {
    it('should reject when no reference is supplied', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await expect(isOsqueryResponseActionAuthorized(coreStart, request, {})).resolves.toBe(false);
    });

    it('should authorize a resolvable saved_query_id with no caller-supplied query', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, { saved_query_id: SAVED_QUERY_ID })
      ).resolves.toBe(true);
    });

    it('should authorize a resolvable pack_id', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, { pack_id: PACK_ID })
      ).resolves.toBe(true);
    });

    it('should reject a saved_query_id that does not resolve', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, {
          saved_query_id: 'does-not-exist',
          query: 'select 42 as leaked;',
        })
      ).resolves.toBe(false);
    });

    it('should reject a whitespace-only saved_query_id', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, {
          saved_query_id: ' ',
          query: 'select 42 as leaked;',
        })
      ).resolves.toBe(false);
    });

    it('should reject a pack_id that does not resolve', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, { pack_id: 'does-not-exist' })
      ).resolves.toBe(false);
    });

    it('should authorize a query matching the stored saved query', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, {
          saved_query_id: SAVED_QUERY_ID,
          query: STORED_QUERY,
        })
      ).resolves.toBe(true);
    });

    it('should reject a query that does not match the stored saved query', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, {
          saved_query_id: SAVED_QUERY_ID,
          query: 'select 42 as leaked;',
        })
      ).resolves.toBe(false);
    });

    it('should reject a queries array smuggled behind a resolvable saved_query_id', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, {
          saved_query_id: SAVED_QUERY_ID,
          queries: [{ query: 'select 42 as leaked;' }],
        })
      ).resolves.toBe(false);
    });

    it('should reject a queries array smuggled behind a resolvable pack_id', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, {
          pack_id: PACK_ID,
          queries: [{ query: 'select 42 as leaked;' }],
        })
      ).resolves.toBe(false);
    });

    it('should reject a queries array even when it matches the stored pack queries', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, {
          pack_id: PACK_ID,
          queries: [{ query: STORED_PACK_QUERY }],
        })
      ).resolves.toBe(false);
    });

    it('should reject a mismatched ecs_mapping on a resolvable saved query', async () => {
      const coreStart = createMockCoreStart(
        { writeLiveQueries: false, runSavedQueries: true },
        {
          [SAVED_QUERY_ID]: {
            query: STORED_QUERY,
            ecs_mapping: [{ key: 'host.name', value: { field: 'name' } }],
          },
        }
      );

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, {
          saved_query_id: SAVED_QUERY_ID,
          ecs_mapping: { 'process.name': { field: 'name' } },
        })
      ).resolves.toBe(false);
    });

    it('should authorize an ecs_mapping that matches the stored saved query', async () => {
      const coreStart = createMockCoreStart(
        { writeLiveQueries: false, runSavedQueries: true },
        {
          [SAVED_QUERY_ID]: {
            query: STORED_QUERY,
            ecs_mapping: [{ key: 'host.name', value: { field: 'name' } }],
          },
        }
      );

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, {
          saved_query_id: SAVED_QUERY_ID,
          ecs_mapping: { 'host.name': { field: 'name' } },
        })
      ).resolves.toBe(true);
    });

    it('should authorize a client-substituted query when the stored query is parameterised', async () => {
      const coreStart = createMockCoreStart(
        { writeLiveQueries: false, runSavedQueries: true },
        { [SAVED_QUERY_ID]: { query: "select * from os_version where name='{{host.os.name}}';" } }
      );

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, {
          saved_query_id: SAVED_QUERY_ID,
          query: "select * from os_version where name='Ubuntu';",
        })
      ).resolves.toBe(true);
    });

    it('should reject SQL appended around a parameterised stored query', async () => {
      const coreStart = createMockCoreStart(
        { writeLiveQueries: false, runSavedQueries: true },
        { [SAVED_QUERY_ID]: { query: "select * from os_version where name='{{host.os.name}}';" } }
      );

      await expect(
        isOsqueryResponseActionAuthorized(coreStart, request, {
          saved_query_id: SAVED_QUERY_ID,
          query: "select * from os_version where name='Ubuntu'; select 42 as leaked;",
        })
      ).resolves.toBe(false);
    });
  });

  describe('resolution', () => {
    it('should resolve capabilities with the correct request and path', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: true, runSavedQueries: false });

      await isOsqueryResponseActionAuthorized(coreStart, request, {});

      expect(coreStart.capabilities.resolveCapabilities).toHaveBeenCalledWith(request, {
        capabilityPath: 'osquery.*',
      });
    });

    it('should not read saved objects when writeLiveQueries short-circuits', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: true, runSavedQueries: false });

      await isOsqueryResponseActionAuthorized(coreStart, request, {
        saved_query_id: SAVED_QUERY_ID,
      });

      expect(coreStart.savedObjects.getScopedClient).not.toHaveBeenCalled();
    });

    it('should look the reference up as the expected saved object type', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await isOsqueryResponseActionAuthorized(coreStart, request, {
        saved_query_id: SAVED_QUERY_ID,
      });

      const soClient = (coreStart.savedObjects.getScopedClient as jest.Mock).mock.results[0].value;
      expect(soClient.get).toHaveBeenCalledWith(savedQuerySavedObjectType, SAVED_QUERY_ID);
    });

    it('should look a pack reference up as the pack saved object type', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await isOsqueryResponseActionAuthorized(coreStart, request, { pack_id: PACK_ID });

      const soClient = (coreStart.savedObjects.getScopedClient as jest.Mock).mock.results[0].value;
      expect(soClient.get).toHaveBeenCalledWith(packSavedObjectType, PACK_ID);
    });

    it('should resolve the same reference only once per request', async () => {
      const coreStart = withSavedQuery({ writeLiveQueries: false, runSavedQueries: true });

      await isOsqueryResponseActionAuthorized(coreStart, request, {
        saved_query_id: SAVED_QUERY_ID,
      });
      await isOsqueryResponseActionAuthorized(coreStart, request, {
        saved_query_id: SAVED_QUERY_ID,
      });

      const soClient = (coreStart.savedObjects.getScopedClient as jest.Mock).mock.results[0].value;
      expect(soClient.get).toHaveBeenCalledTimes(1);
    });
  });
});
