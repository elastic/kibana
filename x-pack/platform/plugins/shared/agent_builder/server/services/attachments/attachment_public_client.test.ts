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
import type { AttachmentPublicClientSource } from './attachment_public_client';
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
    appendEvents: jest.fn().mockResolvedValue(undefined),
  };
  const conversationsService = {
    getScopedClient: jest.fn().mockResolvedValue(conversationClient),
    getConversationRoundAuthor: jest.fn().mockResolvedValue({ id: 'profile-1', username: 'jane' }),
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
    build: (source: AttachmentPublicClientSource = 'http_api') =>
      createAttachmentPublicClient({
        request,
        conversationsService: conversationsService as any,
        attachmentsService: attachmentsService as any,
        coreStart,
        spaces,
        source,
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
    it('adds the attachment and persists it with an attachment_added event in one write', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({ id: 'c1', attachments: [], rounds: [] });

      const client = deps.build();
      const created = await client.create({
        conversationId: 'c1',
        type: 'text',
        data: { text: 'hello' },
        render_inline: true,
      });

      expect(created.type).toBe('text');
      expect(deps.conversationClient.update).not.toHaveBeenCalled();
      expect(deps.conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      const [request, options] = deps.conversationClient.appendEvents.mock.calls[0];
      expect(options).toEqual({ access: 'owner' });
      expect(request.id).toBe('c1');
      expect(request.attachments).toEqual({
        snapshot: [],
        produced: [expect.objectContaining({ id: created.id })],
      });
      expect(deps.conversationsService.getConversationRoundAuthor).toHaveBeenCalledWith({
        request: deps.request,
      });
      expect(request.events).toEqual([
        expect.objectContaining({
          type: 'attachment_added',
          actor: { type: 'user', id: 'profile-1', username: 'jane' },
          data: {
            attachment_id: created.id,
            attachment_type: 'text',
            current_version: 1,
            render_inline: true,
            source: 'http_api',
          },
        }),
      ]);
    });

    it('binds source at factory construction (workflow) so external callers cannot override it', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({ id: 'c1', attachments: [], rounds: [] });

      const client = deps.build('workflow');
      await client.create({ conversationId: 'c1', type: 'text', data: { text: 'hi' } });

      const [request] = deps.conversationClient.appendEvents.mock.calls[0];
      expect(request.events[0].data).toMatchObject({ source: 'workflow' });
    });

    it('binds source `server_api` for external plugin callers reaching the client via AttachmentsStart', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({ id: 'c1', attachments: [], rounds: [] });

      const client = deps.build('server_api');
      await client.create({ conversationId: 'c1', type: 'text', data: { text: 'hi' } });

      const [request] = deps.conversationClient.appendEvents.mock.calls[0];
      expect(request.events[0].data).toMatchObject({ source: 'server_api' });
    });

    it('stamps id "unknown" (does NOT fall back to conversation owner) when the caller has no profile id', async () => {
      // Audit-hostile guardrail: an API-key caller with no profile id must not be silently
      // attributed to the conversation owner — the mutation was not performed by them.
      const deps = buildDeps();
      deps.conversationsService.getConversationRoundAuthor.mockResolvedValue(undefined);
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        user: { id: 'owner-1', username: 'owner' },
        attachments: [],
        rounds: [],
      });

      const client = deps.build();
      await client.create({
        conversationId: 'c1',
        type: 'text',
        data: { text: 'hello' },
      });

      const [request] = deps.conversationClient.appendEvents.mock.calls[0];
      expect(request.events[0].actor).toEqual({ type: 'user', id: 'unknown' });
    });

    it('defaults render_inline to false', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({ id: 'c1', attachments: [], rounds: [] });

      const client = deps.build();
      await client.create({
        conversationId: 'c1',
        type: 'text',
        data: { text: 'hello' },
      });

      const [request] = deps.conversationClient.appendEvents.mock.calls[0];
      expect(request.events[0].data).toMatchObject({ render_inline: false, source: 'http_api' });
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
        client.create({
          conversationId: 'c1',
          id: 'a1',
          type: 'text',
          data: { text: 'x' },
        })
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
        client.create({
          conversationId: 'c1',
          type: 'text',
          data: { wrong: true },
        })
      ).rejects.toMatchObject({ code: 'attachmentInvalid' });
    });
  });

  describe('update', () => {
    it('persists a content change with an attachment_updated event', async () => {
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
      expect(deps.conversationClient.update).not.toHaveBeenCalled();
      const [request] = deps.conversationClient.appendEvents.mock.calls[0];
      expect(request.events).toEqual([
        expect.objectContaining({
          type: 'attachment_updated',
          data: {
            attachment_id: 'a1',
            attachment_type: 'text',
            previous_version: 1,
            current_version: 2,
            render_inline: false,
            source: 'http_api',
          },
        }),
      ]);
    });

    it('persists a description-only change via appendEvents with an empty events array (race-safe reconcile)', async () => {
      // Metadata-only changes still go through `appendEvents` — with `events: []` — so
      // `reconcileAttachments` runs against the caller's snapshot and a concurrent write cannot
      // silently clobber the change.
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [makeAttachment({ id: 'a1' })],
        rounds: [],
      });

      const client = deps.build();
      await client.update({
        conversationId: 'c1',
        attachmentId: 'a1',
        description: 'renamed',
      });

      expect(deps.conversationClient.update).not.toHaveBeenCalled();
      const [request] = deps.conversationClient.appendEvents.mock.calls[0];
      expect(request.events).toEqual([]);
      expect(request.attachments.produced).toEqual([
        expect.objectContaining({ id: 'a1', description: 'renamed' }),
      ]);
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
    it('soft-deletes and emits attachment_deleted with hard_delete=false', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [makeAttachment({ id: 'a1' })],
        rounds: [],
      });

      const client = deps.build();
      await client.delete({ conversationId: 'c1', attachmentId: 'a1' });

      expect(deps.conversationClient.update).not.toHaveBeenCalled();
      const [request] = deps.conversationClient.appendEvents.mock.calls[0];
      expect(request.attachments.produced).toEqual([
        expect.objectContaining({ id: 'a1', active: false }),
      ]);
      expect(request.events).toEqual([
        expect.objectContaining({
          type: 'attachment_deleted',
          data: {
            attachment_id: 'a1',
            attachment_type: 'text',
            hard_delete: false,
            source: 'http_api',
          },
        }),
      ]);
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

    it('permanent delete drops the record and emits hard_delete=true', async () => {
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [makeAttachment({ id: 'a1' })],
        rounds: [],
      });

      const client = deps.build();
      await client.delete({
        conversationId: 'c1',
        attachmentId: 'a1',
        permanent: true,
      });

      const [request] = deps.conversationClient.appendEvents.mock.calls[0];
      expect(request.attachments).toEqual({
        snapshot: [expect.objectContaining({ id: 'a1' })],
        produced: [],
      });
      expect(request.events[0].data).toEqual({
        attachment_id: 'a1',
        attachment_type: 'text',
        hard_delete: true,
        source: 'http_api',
      });
    });

    it('permanent delete of an already soft-deleted attachment persists via appendEvents with an empty events array', async () => {
      // The permanentDelete of a tombstone records no change → no event, but the attachment write
      // still needs `reconcileAttachments` (race-safe path).
      const deps = buildDeps();
      deps.conversationClient.get.mockResolvedValue({
        id: 'c1',
        attachments: [makeAttachment({ id: 'a1', active: false })],
        rounds: [],
      });

      const client = deps.build();
      await client.delete({
        conversationId: 'c1',
        attachmentId: 'a1',
        permanent: true,
      });

      expect(deps.conversationClient.update).not.toHaveBeenCalled();
      const [request] = deps.conversationClient.appendEvents.mock.calls[0];
      expect(request.events).toEqual([]);
      expect(request.attachments.produced).toEqual([]);
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
        client.delete({
          conversationId: 'c1',
          attachmentId: 'a1',
          permanent: true,
        })
      ).rejects.toMatchObject({
        code: 'attachmentPermanentDeleteBlocked',
        meta: { reason: 'client_id' },
      });
    });
  });
});
