/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SmlResolverContext } from './types';
import { createKibanaResolver, parseKibanaResolverPath } from './kibana_resolver';

const buildContext = (overrides: Partial<SmlResolverContext> = {}): SmlResolverContext => ({
  esClient: {} as never,
  savedObjectsClient: { get: jest.fn() } as never,
  request: {} as never,
  spaceId: 'default',
  logger: loggerMock.create(),
  ...overrides,
});

describe('parseKibanaResolverPath', () => {
  it('splits into <so_type>/<so_id> on the first slash', () => {
    expect(parseKibanaResolverPath('lens/abc-123')).toEqual({
      savedObjectType: 'lens',
      savedObjectId: 'abc-123',
    });
  });

  it('preserves slashes in the saved-object id', () => {
    expect(parseKibanaResolverPath('lens/id/with/slashes')).toEqual({
      savedObjectType: 'lens',
      savedObjectId: 'id/with/slashes',
    });
  });

  it('throws when the path has no separator', () => {
    expect(() => parseKibanaResolverPath('lens-only')).toThrow(/Invalid kibana resolver path/);
  });

  it('throws when the id segment is empty', () => {
    expect(() => parseKibanaResolverPath('lens/')).toThrow(/Invalid kibana resolver path/);
  });

  it('throws when the type segment is empty', () => {
    expect(() => parseKibanaResolverPath('/abc')).toThrow(/Invalid kibana resolver path/);
  });
});

describe('createKibanaResolver', () => {
  it('has type "kibana"', () => {
    expect(createKibanaResolver().type).toBe('kibana');
  });

  describe('getPermissions', () => {
    it('returns `saved_object:<type>/get` for a valid path', () => {
      expect(createKibanaResolver().getPermissions('lens/abc-123')).toEqual([
        'saved_object:lens/get',
      ]);
    });

    it('uses the resolver path type segment regardless of the id segment', () => {
      expect(createKibanaResolver().getPermissions('dashboard/anything')).toEqual([
        'saved_object:dashboard/get',
      ]);
    });

    it('throws for malformed paths', () => {
      expect(() => createKibanaResolver().getPermissions('no-separator')).toThrow();
    });
  });

  describe('getItem', () => {
    it('reads the saved object via the scoped client and returns it', async () => {
      const so = { id: 'abc-123', type: 'lens', attributes: { title: 'My viz' } };
      const savedObjectsClient = { get: jest.fn().mockResolvedValue(so) };
      const context = buildContext({ savedObjectsClient: savedObjectsClient as never });

      const item = await createKibanaResolver().getItem('lens/abc-123', context);

      expect(savedObjectsClient.get).toHaveBeenCalledWith('lens', 'abc-123');
      expect(item).toEqual({ type: 'kibana', path: 'lens/abc-123', data: so });
    });

    it('returns undefined and logs when the SO client throws (no-existent / forbidden)', async () => {
      const savedObjectsClient = {
        get: jest.fn().mockRejectedValue(new Error('Saved object not found')),
      };
      const logger = loggerMock.create();
      const context = buildContext({
        savedObjectsClient: savedObjectsClient as never,
        logger,
      });

      const item = await createKibanaResolver().getItem('lens/missing', context);

      expect(item).toBeUndefined();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("failed to read saved object 'lens/missing'")
      );
    });
  });
});
