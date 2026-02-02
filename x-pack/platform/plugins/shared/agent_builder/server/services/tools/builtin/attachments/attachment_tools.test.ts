/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createAttachmentTools } from '.';

describe('attachment tools', () => {
  let attachmentManager: AttachmentStateManager;

  const getTypeDefinition = (type: string) =>
    ({
      id: type,
      validate: (input: unknown) => ({ valid: true, data: input }),
      format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
    } as any);

  beforeEach(() => {
    attachmentManager = createAttachmentStateManager([], { getTypeDefinition });
  });

  const getTools = () => createAttachmentTools({ attachmentManager });
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
