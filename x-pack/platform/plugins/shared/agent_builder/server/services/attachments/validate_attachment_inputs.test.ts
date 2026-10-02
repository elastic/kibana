/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentResolveContext } from '@kbn/agent-builder-server/attachments';
import { createResolveContextMock } from '../../test_utils';
import { validateAttachmentInputs } from './validate_attachment_inputs';
import type { AttachmentTypeRegistry } from './attachment_type_registry';

const createRegistry = (definition?: {
  validate: (
    input: unknown
  ) => Promise<{ valid: true; data: unknown } | { valid: false; error: string }>;
  resolve?: (origin: string, context: AttachmentResolveContext) => Promise<unknown>;
}): AttachmentTypeRegistry =>
  ({
    has: () => definition !== undefined,
    get: () => definition,
  }) as unknown as AttachmentTypeRegistry;

describe('validateAttachmentInputs', () => {
  const resolveContext = createResolveContextMock();
  const validateContext = { request: resolveContext.request };

  describe('Converse attachment input scenarios (structural + resolution)', () => {
    it('only data: validates using inline data', async () => {
      const registry = createRegistry({
        validate: async (input) => ({ valid: true, data: input }),
      });

      await expect(
        validateAttachmentInputs({
          attachments: [{ type: 'text', data: { body: 'only-data' } }],
          registry,
          resolveContext,
          validateContext,
        })
      ).resolves.toEqual([expect.objectContaining({ type: 'text', data: { body: 'only-data' } })]);
    });

    it('only origin: resolves when resolve() and context are available', async () => {
      const resolved = { body: 'from-origin' };
      const registry = createRegistry({
        validate: async (input) => ({ valid: true, data: input }),
        resolve: async () => resolved,
      });

      await expect(
        validateAttachmentInputs({
          attachments: [{ type: 'text', origin: 'dashboard-id' }],
          registry,
          resolveContext,
          validateContext,
        })
      ).resolves.toEqual([
        expect.objectContaining({ type: 'text', data: resolved, origin: 'dashboard-id' }),
      ]);
    });

    it('data and origin: uses inline data and does not call resolve', async () => {
      const resolve = jest.fn().mockRejectedValue(new Error('resolve should not run'));
      const registry = createRegistry({
        validate: async (input) => ({ valid: true, data: input }),
        resolve,
      });

      await expect(
        validateAttachmentInputs({
          attachments: [{ type: 'text', data: { body: 'inline' }, origin: 'so-1' }],
          registry,
          resolveContext,
          validateContext,
        })
      ).resolves.toEqual([
        expect.objectContaining({ type: 'text', data: { body: 'inline' }, origin: 'so-1' }),
      ]);

      expect(resolve).not.toHaveBeenCalled();
    });

    it('neither data nor origin: fails before type validation', async () => {
      const registry = createRegistry({
        validate: async (input) => ({ valid: true, data: input }),
      });

      await expect(
        validateAttachmentInputs({
          attachments: [{ type: 'text' }],
          registry,
          resolveContext,
          validateContext,
        })
      ).rejects.toThrow(
        'Attachment validation failed: Either data or origin must be provided for an attachment'
      );
    });
  });

  it('validates and normalizes every input', async () => {
    const registry = createRegistry({
      validate: async () => ({ valid: true, data: { text: 'validated' } }),
    });

    await expect(
      validateAttachmentInputs({
        attachments: [
          {
            type: 'test-attachment',
            data: { text: 'user message' },
            description: 'User message attachment',
            hidden: true,
            origin: 'saved-object:1',
            group_id: 'group-1',
          },
        ],
        registry,
        resolveContext,
        validateContext,
      })
    ).resolves.toEqual([
      {
        id: expect.any(String),
        type: 'test-attachment',
        data: { text: 'validated' },
        description: 'User message attachment',
        hidden: true,
        origin: 'saved-object:1',
        group_id: 'group-1',
      },
    ]);
  });

  it('returns undefined when there are no inputs', async () => {
    await expect(
      validateAttachmentInputs({
        attachments: undefined,
        registry: createRegistry(),
        resolveContext,
        validateContext,
      })
    ).resolves.toBeUndefined();
  });

  it('rejects unknown attachment types', async () => {
    await expect(
      validateAttachmentInputs({
        attachments: [{ type: 'bad', data: {} }],
        registry: createRegistry(),
        resolveContext,
        validateContext,
      })
    ).rejects.toThrow('Attachment validation failed: Unknown attachment type: bad');
  });

  it('rejects the request on the first invalid input', async () => {
    const registry = createRegistry({
      validate: async () => ({ valid: false, error: 'not valid' }),
    });

    await expect(
      validateAttachmentInputs({
        attachments: [{ type: 'test-attachment', data: {} }],
        registry,
        resolveContext,
        validateContext,
      })
    ).rejects.toThrow('Attachment validation failed: not valid');
  });
});
