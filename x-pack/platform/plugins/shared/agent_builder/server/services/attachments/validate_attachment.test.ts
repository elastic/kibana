/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AttachmentResolveContext } from '@kbn/agent-builder-server/attachments';
import { validateAttachment, type ResolverTypeLookup } from './validate_attachment';

const createResolverLookup = (definition: {
  validate: (
    input: unknown
  ) => Promise<{ valid: true; data: unknown } | { valid: false; error: string }>;
  validateOrigin?: (
    input: unknown
  ) => Promise<{ valid: true; data: string } | { valid: false; error: string }>;
  resolve?: (origin: string, context: AttachmentResolveContext) => Promise<unknown>;
}): ResolverTypeLookup =>
  ({
    has: () => true,
    get: () => definition,
  } as unknown as ResolverTypeLookup);

describe('validateAttachment', () => {
  const request = httpServerMock.createKibanaRequest();
  const resolveContext: AttachmentResolveContext = {
    request,
    spaceId: 'default',
    savedObjectsClient: {} as AttachmentResolveContext['savedObjectsClient'],
  };

  describe('Converse attachment input scenarios (structural + resolution)', () => {
    it('only data: validates using inline data', async () => {
      const resolverLookup = createResolverLookup({
        validate: async (input) => ({ valid: true, data: input }),
      });

      const result = await validateAttachment({
        attachment: { type: 'text', data: { body: 'only-data' } },
        resolverLookup,
        resolveContext,
      });

      expect(result).toEqual({
        valid: true,
        attachment: expect.objectContaining({
          type: 'text',
          data: { body: 'only-data' },
        }),
      });
    });

    it('only origin: resolves when resolve() and context are available', async () => {
      const resolved = { body: 'from-origin' };
      const resolverLookup = createResolverLookup({
        validate: async (input) => ({ valid: true, data: input }),
        resolve: async () => resolved,
      });

      const result = await validateAttachment({
        attachment: { type: 'text', origin: 'dashboard-id' },
        resolverLookup,
        resolveContext,
      });

      expect(result).toEqual({
        valid: true,
        attachment: expect.objectContaining({
          type: 'text',
          data: resolved,
          origin: 'dashboard-id',
        }),
      });
    });

    it('data and origin: uses inline data and does not call resolve', async () => {
      const resolve = jest.fn().mockRejectedValue(new Error('resolve should not run'));
      const resolverLookup = createResolverLookup({
        validate: async (input) => ({ valid: true, data: input }),
        resolve,
      });

      const inline = { body: 'inline' };
      const result = await validateAttachment({
        attachment: { type: 'text', data: inline, origin: 'so-1' },
        resolverLookup,
        resolveContext,
      });

      expect(resolve).not.toHaveBeenCalled();
      expect(result).toEqual({
        valid: true,
        attachment: expect.objectContaining({
          type: 'text',
          data: inline,
          origin: 'so-1',
        }),
      });
    });

    it('neither data nor origin: fails before type validation', async () => {
      const resolverLookup = createResolverLookup({
        validate: async (input) => ({ valid: true, data: input }),
      });

      const result = await validateAttachment({
        attachment: { type: 'text' },
        resolverLookup,
        resolveContext,
      });

      expect(result).toEqual({
        valid: false,
        error:
          'Error during attachment validation: Either data or origin must be provided for an attachment',
      });
    });

    it('only origin: validateOrigin failure surfaces as validation error', async () => {
      const resolve = jest.fn();
      const resolverLookup = createResolverLookup({
        validate: async (input) => ({ valid: true, data: input }),
        validateOrigin: async () => ({ valid: false, error: 'bad origin' }),
        resolve,
      });

      const result = await validateAttachment({
        attachment: { type: 'text', origin: 'x' },
        resolverLookup,
        resolveContext,
      });

      expect(resolve).not.toHaveBeenCalled();
      expect(result).toEqual({
        valid: false,
        error: 'Error during attachment validation: bad origin',
      });
    });

    it('only origin: passes validated origin string to resolve', async () => {
      const resolve = jest.fn().mockResolvedValue({ body: 'ok' });
      const resolverLookup = createResolverLookup({
        validate: async (input) => ({ valid: true, data: input }),
        validateOrigin: async () => ({ valid: true, data: 'normalized-id' }),
        resolve,
      });

      await validateAttachment({
        attachment: { type: 'text', origin: 'raw' },
        resolverLookup,
        resolveContext,
      });

      expect(resolve).toHaveBeenCalledWith('normalized-id', resolveContext);
    });
  });
});
