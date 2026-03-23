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

  it('validates by-value attachments and preserves optional origin', async () => {
    const registry = createRegistry({
      validate: async (input) => ({ valid: true, data: input }),
    });

    const result = await validateAttachment({
      attachment: { type: 'text', data: { body: 'hi' }, origin: 'so-1' },
      registry,
    });

    expect(result).toEqual({
      valid: true,
      attachment: expect.objectContaining({
        type: 'text',
        data: { body: 'hi' },
        origin: 'so-1',
      }),
    });
  });

  it('resolves origin-only attachments when resolve context and resolve() are available', async () => {
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

  it('fails origin-only attachments without resolve context', async () => {
    const registry = createRegistry({
      validate: async (input) => ({ valid: true, data: input }),
      resolve: async () => ({}),
    });

    const result = await validateAttachment({
      attachment: { type: 'text', origin: 'x' },
      registry,
    });

    expect(result).toEqual({
      valid: false,
      error: 'Resolve context is required for attachments that only specify origin',
    });
  });

  it('fails when neither data nor origin is provided', async () => {
    const registry = createRegistry({
      validate: async (input) => ({ valid: true, data: input }),
    });

    const result = await validateAttachment({
      attachment: { type: 'text' },
      registry,
    });

    expect(result).toEqual({
      valid: false,
      error: 'Either data or origin must be provided for an attachment',
    });
  });
});
