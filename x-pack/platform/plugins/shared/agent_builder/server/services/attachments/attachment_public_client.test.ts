/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreStart } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { createAttachmentPublicClient } from './attachment_public_client';

const makeAttachment = (overrides: Partial<VersionedAttachment> = {}): VersionedAttachment =>
  ({
    id: 'a1',
    type: 'text',
    current_version: 1,
    versions: [
      {
        version: 1,
        data: { text: 'hi' },
        created_at: '2026-01-01T00:00:00.000Z',
        content_hash: 'h1',
        estimated_tokens: 1,
      },
    ],
    active: true,
    ...overrides,
  } as VersionedAttachment);

const buildDeps = () => {
  const request = httpServerMock.createKibanaRequest() as unknown as KibanaRequest;
  const coreStart = coreMock.createStart() as unknown as CoreStart;
  const spaces = {
    spacesService: {
      getSpaceId: jest.fn().mockReturnValue('default'),
    },
  } as unknown as SpacesPluginStart;

  const conversationClient = {
    get: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const conversationsService = {
    getScopedClient: jest.fn().mockResolvedValue(conversationClient),
  };
  const attachmentsService = {
    getTypeDefinition: jest.fn().mockReturnValue({
      id: 'text',
      validate: async (data: unknown) => ({ valid: true, data }),
      isReadonly: false,
    }),
  };

  return {
    request,
    coreStart,
    spaces,
    conversationClient,
    conversationsService,
    attachmentsService,
    build: () =>
      createAttachmentPublicClient({
        request,
        conversationsService: conversationsService as any,
        attachmentsService: attachmentsService as any,
        coreStart,
        spaces,
      }),
  };
};

describe('createAttachmentPublicClient', () => {
  describe('list', () => {
    it('returns active attachments by default', async () => {
      const deps = buildDeps();
      const active = makeAttachment({ id: 'a1' });
      const deleted = makeAttachment({ id: 'a2', active: false });
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [active, deleted],
        rounds: [],
      });

      const client = deps.build();
      const result = await client.list({ conversationId: 'c1' });

      expect(deps.conversationsService.getScopedClient).toHaveBeenCalledWith({
        request: deps.request,
      });
      expect(result.results.map((r) => r.id)).toEqual(['a1']);
      expect(typeof result.total_token_estimate).toBe('number');
    });

    it('includes deleted attachments when includeDeleted is true', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [makeAttachment({ id: 'a1' }), makeAttachment({ id: 'a2', active: false })],
        rounds: [],
      });

      const client = deps.build();
      const result = await client.list({ conversationId: 'c1', includeDeleted: true });

      expect(result.results.map((r) => r.id).sort()).toEqual(['a1', 'a2']);
    });
  });

  describe('get', () => {
    it('returns the raw attachment record', async () => {
      const deps = buildDeps();
      const a1 = makeAttachment({ id: 'a1' });
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [a1],
        rounds: [],
      });

      const client = deps.build();
      const result = await client.get({ conversationId: 'c1', attachmentId: 'a1' });

      expect(result.id).toBe('a1');
    });

    it('throws AttachmentNotFoundError when the attachment is missing', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [],
        rounds: [],
      });

      const client = deps.build();

      await expect(
        client.get({ conversationId: 'c1', attachmentId: 'missing' })
      ).rejects.toMatchObject({ code: 'attachmentNotFound' });
    });
  });

  describe('create', () => {
    it('adds the attachment, persists the conversation and returns the record', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [],
        rounds: [],
      });

      const client = deps.build();
      const created = await client.create({
        conversationId: 'c1',
        type: 'text',
        data: { text: 'hello' },
      });

      expect(created.type).toBe('text');
      expect(deps.conversationClient.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c1' })
      );
    });

    it('throws AttachmentConflictError when the id already exists', async () => {
      const deps = buildDeps();
      const existing = makeAttachment({ id: 'a1' });
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [existing],
        rounds: [],
      });

      const client = deps.build();

      await expect(
        client.create({ conversationId: 'c1', id: 'a1', type: 'text', data: { text: 'x' } })
      ).rejects.toMatchObject({ code: 'attachmentAlreadyExists' });
    });

    it('throws AttachmentValidationError when the type validation fails', async () => {
      const deps = buildDeps();
      deps.attachmentsService.getTypeDefinition = jest.fn().mockReturnValue({
        id: 'text',
        validate: async () => ({ valid: false, error: 'bad shape' }),
        isReadonly: false,
      });
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [],
        rounds: [],
      });

      const client = deps.build();

      await expect(
        client.create({ conversationId: 'c1', type: 'text', data: { wrong: true } })
      ).rejects.toMatchObject({ code: 'attachmentInvalid' });
    });
  });

  describe('update', () => {
    it('updates and returns the attachment', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [makeAttachment({ id: 'a1' })],
        rounds: [],
      });

      const client = deps.build();
      const updated = await client.update({
        conversationId: 'c1',
        attachmentId: 'a1',
        data: { text: 'new' },
      });

      expect(updated.id).toBe('a1');
      expect(deps.conversationClient.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c1' })
      );
    });

    it('throws AttachmentNotFoundError when the attachment is missing', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [],
        rounds: [],
      });

      const client = deps.build();

      await expect(
        client.update({
          conversationId: 'c1',
          attachmentId: 'missing',
          data: { text: 'x' },
        })
      ).rejects.toMatchObject({ code: 'attachmentNotFound' });
    });

    it('throws AttachmentValidationError when the attachment is deleted', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [makeAttachment({ id: 'a1', active: false })],
        rounds: [],
      });

      const client = deps.build();

      await expect(
        client.update({
          conversationId: 'c1',
          attachmentId: 'a1',
          data: { text: 'x' },
        })
      ).rejects.toMatchObject({ code: 'attachmentInvalid' });
    });
  });

  describe('delete', () => {
    it('soft-deletes and persists when no options are passed', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [makeAttachment({ id: 'a1' })],
        rounds: [],
      });

      const client = deps.build();
      await client.delete({ conversationId: 'c1', attachmentId: 'a1' });

      expect(deps.conversationClient.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c1' })
      );
    });

    it('throws AttachmentNotFoundError when the attachment is missing', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [],
        rounds: [],
      });

      const client = deps.build();

      await expect(
        client.delete({ conversationId: 'c1', attachmentId: 'missing' })
      ).rejects.toMatchObject({ code: 'attachmentNotFound' });
    });

    it('rejects deletion of screen_context attachments', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [makeAttachment({ id: 'sc', type: 'screen_context' })],
        rounds: [],
      });

      const client = deps.build();

      await expect(
        client.delete({ conversationId: 'c1', attachmentId: 'sc' })
      ).rejects.toMatchObject({ code: 'attachmentInvalid' });
    });

    it('permanent delete succeeds when unreferenced and no client_id', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [makeAttachment({ id: 'a1' })],
        rounds: [],
      });

      const client = deps.build();
      await client.delete({ conversationId: 'c1', attachmentId: 'a1', permanent: true });

      expect(deps.conversationClient.update).toHaveBeenCalled();
    });

    it('permanent delete throws attachmentPermanentDeleteBlocked when attachment has client_id', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [makeAttachment({ id: 'a1', client_id: 'flyout-x' } as any)],
        rounds: [],
      });

      const client = deps.build();

      await expect(
        client.delete({ conversationId: 'c1', attachmentId: 'a1', permanent: true })
      ).rejects.toMatchObject({
        code: 'attachmentPermanentDeleteBlocked',
        meta: { reason: 'client_id' },
      });
    });
  });
});
