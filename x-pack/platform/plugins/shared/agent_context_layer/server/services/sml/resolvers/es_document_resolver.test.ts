/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SmlResolverContext } from './types';
import { createEsDocumentResolver, parseEsDocumentResolverPath } from './es_document_resolver';

const buildContext = (
  asCurrentUser: { get: jest.Mock } = { get: jest.fn() }
): SmlResolverContext => ({
  esClient: {
    asCurrentUser,
    asInternalUser: { get: jest.fn() },
  } as never,
  savedObjectsClient: {} as never,
  request: {} as never,
  spaceId: 'default',
  logger: loggerMock.create(),
});

describe('parseEsDocumentResolverPath', () => {
  it('splits on the first `/`', () => {
    expect(parseEsDocumentResolverPath('my-index/doc-1')).toEqual({
      index: 'my-index',
      docId: 'doc-1',
    });
  });

  it('preserves slashes in the document id', () => {
    expect(parseEsDocumentResolverPath('my-index/doc/with/slashes')).toEqual({
      index: 'my-index',
      docId: 'doc/with/slashes',
    });
  });

  it.each([['noseparator'], ['index/'], ['/doc']])('throws for malformed path %p', (path) => {
    expect(() => parseEsDocumentResolverPath(path)).toThrow(/Invalid es_document resolver path/);
  });
});

describe('createEsDocumentResolver', () => {
  it('has type "es_document"', () => {
    expect(createEsDocumentResolver().type).toBe('es_document');
  });

  describe('getPermissions', () => {
    it('returns `es-index:<index>:read`', () => {
      expect(createEsDocumentResolver().getPermissions('my-index/doc-1')).toEqual([
        'es-index:my-index:read',
      ]);
    });
  });

  describe('getItem', () => {
    it('calls esClient.asCurrentUser.get and returns the document on found', async () => {
      const get = jest.fn().mockResolvedValue({
        found: true,
        _index: 'my-index',
        _id: 'doc-1',
        _source: { hello: 'world' },
      });
      const context = buildContext({ get });

      const item = await createEsDocumentResolver().getItem('my-index/doc-1', context);

      expect(get).toHaveBeenCalledWith({ index: 'my-index', id: 'doc-1' });
      expect(item).toEqual({
        type: 'es_document',
        path: 'my-index/doc-1',
        data: { index: 'my-index', id: 'doc-1', document: { hello: 'world' } },
      });
    });

    it('returns undefined when the document is not found', async () => {
      const get = jest.fn().mockResolvedValue({ found: false });
      const context = buildContext({ get });

      const item = await createEsDocumentResolver().getItem('my-index/doc-missing', context);

      expect(item).toBeUndefined();
    });

    it('returns undefined and logs on error (e.g. forbidden / 404 / network)', async () => {
      const get = jest.fn().mockRejectedValue(new Error('forbidden'));
      const logger = loggerMock.create();
      const context: SmlResolverContext = { ...buildContext({ get }), logger };

      const item = await createEsDocumentResolver().getItem('my-index/doc-1', context);

      expect(item).toBeUndefined();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("failed to read document 'my-index/doc-1'")
      );
    });
  });
});
