/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SmlResolverContext } from './types';
import { createEsIndexResolver, parseEsIndexResolverPath } from './es_index_resolver';

const buildContext = (
  asCurrentUser: { indices: { getMapping: jest.Mock } } = {
    indices: { getMapping: jest.fn() },
  }
): SmlResolverContext => ({
  esClient: {
    asCurrentUser,
    asInternalUser: { indices: { getMapping: jest.fn() } },
  } as never,
  savedObjectsClient: {} as never,
  request: {} as never,
  spaceId: 'default',
  logger: loggerMock.create(),
});

describe('parseEsIndexResolverPath', () => {
  it('accepts a simple index name', () => {
    expect(parseEsIndexResolverPath('my-index')).toEqual({ index: 'my-index' });
  });

  it.each([[''], ['has/slash'], ['logs/2024']])('throws for invalid path %p', (path) => {
    expect(() => parseEsIndexResolverPath(path)).toThrow(/Invalid es_index resolver path/);
  });
});

describe('createEsIndexResolver', () => {
  it('has type "es_index"', () => {
    expect(createEsIndexResolver().type).toBe('es_index');
  });

  describe('getPermissions', () => {
    it('returns `es-index:<index>:view_index_metadata`', () => {
      expect(createEsIndexResolver().getPermissions('my-index')).toEqual([
        'es-index:my-index:view_index_metadata',
      ]);
    });
  });

  describe('getItem', () => {
    it('returns the mappings keyed by index when present', async () => {
      const getMapping = jest.fn().mockResolvedValue({
        'my-index': { mappings: { properties: { foo: { type: 'keyword' } } } },
      });
      const context = buildContext({ indices: { getMapping } });

      const item = await createEsIndexResolver().getItem('my-index', context);

      expect(getMapping).toHaveBeenCalledWith({ index: 'my-index' });
      expect(item).toEqual({
        type: 'es_index',
        path: 'my-index',
        data: {
          index: 'my-index',
          mappings: { 'my-index': { properties: { foo: { type: 'keyword' } } } },
        },
      });
    });

    it('returns undefined when the response contains no mappings', async () => {
      const getMapping = jest.fn().mockResolvedValue({});
      const context = buildContext({ indices: { getMapping } });

      const item = await createEsIndexResolver().getItem('missing-index', context);

      expect(item).toBeUndefined();
    });

    it('returns undefined and logs on error', async () => {
      const getMapping = jest.fn().mockRejectedValue(new Error('forbidden'));
      const logger = loggerMock.create();
      const context: SmlResolverContext = {
        ...buildContext({ indices: { getMapping } }),
        logger,
      };

      const item = await createEsIndexResolver().getItem('my-index', context);

      expect(item).toBeUndefined();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("failed to read mappings for 'my-index'")
      );
    });
  });
});
