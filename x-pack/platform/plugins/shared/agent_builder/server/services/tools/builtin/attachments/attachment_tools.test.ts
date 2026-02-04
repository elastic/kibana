/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createAttachmentTools } from '.';

describe('attachment tools', () => {
  let attachmentManager: AttachmentStateManager;

  const getTypeDefinition = (type: string) =>
    ({
      id: type,
      validate: (input: unknown) => ({ valid: true, data: input }),
      format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
      isReadonly: false,
    } as any);

  beforeEach(() => {
    attachmentManager = createAttachmentStateManager([], { getTypeDefinition });
  });

  const attachmentsService = {
    getTypeDefinition: () => ({
      id: 'text',
      validate: (input: unknown) => ({ valid: true, data: input }),
      format: (attachment: { data: unknown }) => ({
        getRepresentation: () => ({
          type: 'text',
          value: `formatted:${String(attachment.data)}`,
        }),
      }),
      isReadonly: false,
    }),
  } as any;

  const formatContext = { request: httpServerMock.createKibanaRequest(), spaceId: 'default' };

  const getTools = () =>
    createAttachmentTools({
      attachmentManager,
      attachmentsService,
      formatContext,
    });
  const getTool = (id: string) => getTools().find((t) => t.id === id)!;

  describe('attachment_add', () => {
    it('creates a new attachment', async () => {
      const tool = getTool('platform.core.attachment_add');
      const result = (await tool.handler(
        { type: 'text', data: 'hello world', description: 'Test' },
        {} as any
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect((result.results[0] as any).data.type).toBe('text');
      expect((result.results[0] as any).data.attachment_id).toBeDefined();
    });

    it('returns error for read-only attachment types', async () => {
      const readonlyAttachmentsService = {
        getTypeDefinition: () => ({
          id: 'text',
          validate: (input: unknown) => ({ valid: true, data: input }),
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
          isReadonly: true,
        }),
      } as any;

      const tool = createAttachmentTools({
        attachmentManager,
        attachmentsService: readonlyAttachmentsService,
        formatContext,
      }).find((t) => t.id === 'platform.core.attachment_add')!;

      const result = (await tool.handler(
        { type: 'text', data: 'hello world', description: 'Test' },
        {} as any
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0] as any).data.message).toContain('read-only');
    });

    it('creates an attachment with a custom ID', async () => {
      const tool = getTool('platform.core.attachment_add');
      const result = (await tool.handler(
        {
          id: 'custom-id',
          type: 'text',
          data: 'hello world',
          description: 'Test',
        },
        {} as any
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect((result.results[0] as any).data.attachment_id).toBe('custom-id');
      expect((result.results[0] as any).data.type).toBe('text');
    });

    it('returns error for duplicate ID', async () => {
      // First, create an attachment with a specific ID
      await attachmentManager.add({
        id: 'duplicate-id',
        type: 'text',
        data: 'first',
        description: 'First',
      });

      // Try to create another attachment with the same ID
      const tool = getTool('platform.core.attachment_add');
      const result = (await tool.handler(
        {
          id: 'duplicate-id',
          type: 'text',
          data: 'second',
          description: 'Second',
        },
        {} as any
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0] as any).data.message).toContain('already exists');
    });
  });

  describe('attachment_read', () => {
    it('reads an existing attachment', async () => {
      const attachment = await attachmentManager.add({
        type: 'text',
        data: 'hello',
        description: 'Test',
      });
      const tool = getTool('platform.core.attachment_read');
      const result = (await tool.handler(
        { attachment_id: attachment.id },
        {} as any
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect((result.results[0] as any).data.type).toBe('text');
      expect((result.results[0] as any).data.data).toBe('hello');
    });

    it('resolves visualization_ref attachments when savedObjectsClient is available', async () => {
      const customAttachmentsService = {
        getTypeDefinition: () =>
          ({
            id: AttachmentType.visualizationRef,
            validate: (input: unknown) => ({ valid: true, data: input }),
            format: (formattedAttachment: Attachment) => ({
              getRepresentation: () => ({
                type: 'text',
                value: JSON.stringify(formattedAttachment.data),
              }),
            }),
            resolve: async (_a: Attachment, ctx: AttachmentResolveContext) => {
              const resolved = await ctx.savedObjectsClient!.resolve('lens', 'so-123');
              return {
                found: true,
                outcome: resolved.outcome,
                alias_target_id: resolved.alias_target_id,
                saved_object_id: resolved.saved_object.id,
                saved_object_type: resolved.saved_object.type,
                updated_at: resolved.saved_object.updated_at,
                attributes: resolved.saved_object.attributes,
                title: (resolved.saved_object.attributes as any).title,
                description: (resolved.saved_object.attributes as any).description,
              };
            },
          } as unknown as AttachmentTypeDefinition),
      } as any;
      const resolveAttachmentManager = createAttachmentStateManager([], {
        getTypeDefinition: customAttachmentsService.getTypeDefinition,
      });
      const attachment = await resolveAttachmentManager.add({
        type: AttachmentType.visualizationRef,
        data: {
          saved_object_id: 'so-123',
        },
        description: 'Lens ref',
      });
      const tool = createAttachmentTools({
        attachmentManager: resolveAttachmentManager,
        attachmentsService: customAttachmentsService,
        formatContext,
      }).find((t) => t.id === 'platform.core.attachment_read')!;
      const result = (await tool.handler({ attachment_id: attachment.id }, {
        savedObjectsClient: {
          resolve: async () => ({
            outcome: 'exactMatch',
            alias_target_id: null,
            saved_object: {
              id: 'so-123',
              type: 'lens',
              updated_at: '2026-01-01T00:00:00.000Z',
              attributes: { title: 'My Lens', description: 'Desc', state: { a: 1 } },
            },
          }),
        },
      } as any)) as ToolHandlerStandardReturn;

      expect((result.results[0] as any).data.type).toBe(AttachmentType.visualizationRef);
      expect((result.results[0] as any).data.raw_data).toEqual({ saved_object_id: 'so-123' });
      expect((result.results[0] as any).data.data).toContain('"found":true');
      expect((result.results[0] as any).data.data).toContain('"title":"My Lens"');
    });

    it('reads a specific version', async () => {
      const attachment = await attachmentManager.add({
        type: 'text',
        data: 'v1',
        description: 'Test',
      });
      await attachmentManager.update(attachment.id, { data: 'v2' });

      const tool = getTool('platform.core.attachment_read');
      const result = (await tool.handler(
        { attachment_id: attachment.id, version: 1 },
        {} as any
      )) as ToolHandlerStandardReturn;

      expect((result.results[0] as any).data.type).toBe('text');
      expect((result.results[0] as any).data.data).toBe('v1');
    });

    it('returns error for non-existent attachment', async () => {
      const tool = getTool('platform.core.attachment_read');
      const result = (await tool.handler(
        { attachment_id: 'non-existent' },
        {} as any
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.error);
    });
  });

  describe('attachment_update', () => {
    it('updates an attachment', async () => {
      const attachment = await attachmentManager.add({
        type: 'text',
        data: 'v1',
        description: 'Test',
      });
      const tool = getTool('platform.core.attachment_update');
      const result = (await tool.handler(
        { attachment_id: attachment.id, data: 'v2' },
        {} as any
      )) as ToolHandlerStandardReturn;

      expect((result.results[0] as any).data.type).toBe('text');
      expect((result.results[0] as any).data.version).toBe(2);
      expect((result.results[0] as any).data.version_created).toBe(true);
    });

    it('returns error for deleted attachment', async () => {
      const attachment = await attachmentManager.add({
        type: 'text',
        data: 'v1',
        description: 'Test',
      });
      attachmentManager.delete(attachment.id);

      const tool = getTool('platform.core.attachment_update');
      const result = (await tool.handler(
        { attachment_id: attachment.id, data: 'v2' },
        {} as any
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
    });

    it('returns error for read-only attachments', async () => {
      const readonlyAttachmentsService = {
        getTypeDefinition: () => ({
          id: 'text',
          validate: (input: unknown) => ({ valid: true, data: input }),
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
          isReadonly: true,
        }),
      } as any;

      const tool = createAttachmentTools({
        attachmentManager,
        attachmentsService: readonlyAttachmentsService,
        formatContext,
      }).find((t) => t.id === 'platform.core.attachment_update')!;

      const attachment = await attachmentManager.add({
        type: 'text',
        data: 'v1',
        description: 'Test',
      });

      const result = (await tool.handler(
        { attachment_id: attachment.id, data: 'v2' },
        {} as any
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0] as any).data.message).toContain('read-only');
    });
  });

  describe('attachment_list', () => {
    it('lists active attachments', async () => {
      await attachmentManager.add({ type: 'text', data: 'a1', description: 'Attachment 1' });
      await attachmentManager.add({
        type: 'json',
        data: { key: 'value' },
        description: 'Attachment 2',
      });

      const tool = getTool('platform.core.attachment_list');
      const result = (await tool.handler({}, {} as any)) as ToolHandlerStandardReturn;

      expect((result.results[0] as any).data.count).toBe(2);
      expect((result.results[0] as any).data.attachments).toHaveLength(2);
    });

    it('includes deleted when requested', async () => {
      const a1 = await attachmentManager.add({
        type: 'text',
        data: 'a1',
        description: 'Attachment 1',
      });
      await attachmentManager.add({ type: 'text', data: 'a2', description: 'Attachment 2' });
      attachmentManager.delete(a1.id);

      const tool = getTool('platform.core.attachment_list');
      const resultActive = (await tool.handler({}, {} as any)) as ToolHandlerStandardReturn;
      const resultAll = (await tool.handler(
        { include_deleted: true },
        {} as any
      )) as ToolHandlerStandardReturn;

      expect((resultActive.results[0] as any).data.count).toBe(1);
      expect((resultAll.results[0] as any).data.count).toBe(2);
    });
  });

  describe('attachment_diff', () => {
    it('computes diff between versions', async () => {
      const attachment = await attachmentManager.add({
        type: 'text',
        data: 'version 1',
        description: 'Test',
      });
      await attachmentManager.update(attachment.id, { data: 'version 2' });

      const tool = getTool('platform.core.attachment_diff');
      const result = (await tool.handler(
        {
          attachment_id: attachment.id,
          from_version: 1,
          to_version: 2,
        },
        {} as any
      )) as ToolHandlerStandardReturn;

      expect((result.results[0] as any).data.attachment_id).toBe(attachment.id);
      expect((result.results[0] as any).data.from_version).toBe(1);
      expect((result.results[0] as any).data.to_version).toBe(2);
      expect((result.results[0] as any).data.from_data).toBe('version 1');
      expect((result.results[0] as any).data.to_data).toBe('version 2');
    });

    it('returns error for non-existent attachment', async () => {
      const tool = getTool('platform.core.attachment_diff');
      const result = (await tool.handler(
        {
          attachment_id: 'non-existent',
          from_version: 1,
          to_version: 2,
        },
        {} as any
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
    });
  });
});
