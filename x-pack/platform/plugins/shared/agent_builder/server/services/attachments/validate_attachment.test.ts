/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentResolveContext } from '@kbn/agent-builder-server/attachments';
import { createResolveContextMock } from '../../test_utils';
import { validateAttachments } from './validate_attachment';
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

describe('validateAttachments', () => {
  const resolveContext = createResolveContextMock();

  describe('Converse attachment input scenarios (structural + resolution)', () => {
    it('only data: validates using inline data', async () => {
      const registry = createRegistry({
        validate: async (input) => ({ valid: true, data: input }),
      });

      await expect(
        validateAttachments({
          attachments: [{ type: 'text', data: { body: 'only-data' } }],
          registry,
          resolveContext,
        })
      ).resolves.toEqual([
        expect.objectContaining({
          type: 'text',
          data: { body: 'only-data' },
        }),
      ]);
    });

    it('only origin: resolves when resolve() and context are available', async () => {
      const resolved = { body: 'from-origin' };
      const registry = createRegistry({
        validate: async (input) => ({ valid: true, data: input }),
        resolve: async () => resolved,
      });

      await expect(
        validateAttachments({
          attachments: [{ type: 'text', origin: 'dashboard-id' }],
          registry,
          resolveContext,
        })
      ).resolves.toEqual([
        expect.objectContaining({
          type: 'text',
          data: resolved,
          origin: 'dashboard-id',
        }),
      ]);
    });

    it('data and origin: uses inline data and does not call resolve', async () => {
      const resolve = jest.fn().mockRejectedValue(new Error('resolve should not run'));
      const registry = createRegistry({
        validate: async (input) => ({ valid: true, data: input }),
        resolve,
      });

      await expect(
        validateAttachments({
          attachments: [{ type: 'text', data: { body: 'inline' }, origin: 'so-1' }],
          registry,
          resolveContext,
        })
      ).resolves.toEqual([
        expect.objectContaining({
          type: 'text',
          data: { body: 'inline' },
          origin: 'so-1',
        }),
      ]);

      expect(resolve).not.toHaveBeenCalled();
    });

    it('neither data nor origin: fails before type validation', async () => {
      const registry = createRegistry({
        validate: async (input) => ({ valid: true, data: input }),
      });

      await expect(
        validateAttachments({
          attachments: [{ type: 'text' }],
          registry,
          resolveContext,
        })
      ).rejects.toThrow(
        'Attachment validation failed: Either data or origin must be provided for an attachment'
      );
    });
  });

  it('validates each attachment and returns validated attachment shape', async () => {
    const registry = createRegistry({
      validate: async (input) => ({ valid: true, data: input }),
    });

    await expect(
      validateAttachments({
        attachments: [
          {
            type: 'text',
            data: { body: 'context' },
            group_id: 'group-1',
          },
        ],
        registry,
        resolveContext,
      })
    ).resolves.toEqual([
      expect.objectContaining({
        type: 'text',
        data: { body: 'context' },
        group_id: 'group-1',
      }),
    ]);
  });
});
