/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AttachmentResolveContext } from '@kbn/agent-builder-server/attachments';
import { validateAttachment } from './validate_attachment';
import type { AttachmentTypeRegistry } from './attachment_type_registry';

const createRegistry = (definition: {
  validate: (
    input: unknown
  ) => Promise<{ valid: true; data: unknown } | { valid: false; error: string }>;
  resolve?: (origin: string, context: AttachmentResolveContext) => Promise<unknown>;
}): AttachmentTypeRegistry =>
  ({
    has: () => true,
    get: () => definition,
  } as unknown as AttachmentTypeRegistry);

describe('validateAttachment', () => {
  const request = httpServerMock.createKibanaRequest();
  const resolveContext: AttachmentResolveContext = {
    request,
    spaceId: 'default',
    savedObjectsClient: {} as AttachmentResolveContext['savedObjectsClient'],
  };

  describe('Converse attachment input scenarios (structural + resolution)', () => {
    it('only data: validates using inline data', async () => {
      const registry = createRegistry({
        validate: async (input) => ({ valid: true, data: input }),
      });

      const result = await validateAttachment({
        attachment: { type: 'text', data: { body: 'only-data' } },
        registry,
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
      const registry = createRegistry({
        validate: async (input) => ({ valid: true, data: input }),
        resolve: async () => resolved,
      });

      const result = await validateAttachment({
        attachment: { type: 'text', origin: 'dashboard-id' },
        registry,
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
      const registry = createRegistry({
        validate: async (input) => ({ valid: true, data: input }),
        resolve,
      });

      const result = await validateAttachment({
        attachment: { type: 'text', data: { body: 'inline' }, origin: 'so-1' },
        registry,
        resolveContext,
      });

      expect(resolve).not.toHaveBeenCalled();
      expect(result).toEqual({
        valid: true,
        attachment: expect.objectContaining({
          type: 'text',
          data: { body: 'inline' },
          origin: 'so-1',
        }),
      });
    });

    it('neither data nor origin: fails before type validation', async () => {
      const registry = createRegistry({
        validate: async (input) => ({ valid: true, data: input }),
      });

      const result = await validateAttachment({
        attachment: { type: 'text' },
        registry,
        resolveContext,
      });

      expect(result).toEqual({
        valid: false,
        error:
          'Error during attachment validation: Either data or origin must be provided for an attachment',
      });
    });
  });
});
