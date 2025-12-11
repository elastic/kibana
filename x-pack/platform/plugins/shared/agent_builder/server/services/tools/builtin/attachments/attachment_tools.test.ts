/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createAttachmentTools } from '.';

describe('attachment tools', () => {
  let attachmentManager: AttachmentStateManager;

  beforeEach(() => {
    attachmentManager = createAttachmentStateManager([]);
  });

  const getTools = () => createAttachmentTools({ attachmentManager });
  const getTool = (id: string) => getTools().find((t) => t.id === id)!;

  describe('attachment_add', () => {
    it('creates a new attachment', async () => {
      const tool = getTool('platform.core.attachment_add');
      const result = await tool.handler({ type: 'text', data: 'hello world', description: 'Test' });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect((result.results[0] as any).data.__attachment_operation__).toBe('add');
      expect((result.results[0] as any).data.type).toBe('text');
      expect((result.results[0] as any).data.description).toBe('Test');
      expect((result.results[0] as any).data.version).toBe(1);
    });
  });

  describe('attachment_read', () => {
    it('reads an existing attachment', async () => {
      const attachment = attachmentManager.add({
        type: 'text',
        data: 'hello',
        description: 'Test',
      });
      const tool = getTool('platform.core.attachment_read');
      const result = await tool.handler({ attachment_id: attachment.id });

      expect(result.results).toHaveLength(1);
      expect((result.results[0] as any).data.__attachment_operation__).toBe('read');
      expect((result.results[0] as any).data.data).toBe('hello');
    });

    it('reads a specific version', async () => {
      const attachment = attachmentManager.add({ type: 'text', data: 'v1', description: 'Test' });
      attachmentManager.update(attachment.id, { data: 'v2' });

      const tool = getTool('platform.core.attachment_read');
      const result = await tool.handler({ attachment_id: attachment.id, version: 1 });

      expect((result.results[0] as any).data.data).toBe('v1');
      expect((result.results[0] as any).data.version).toBe(1);
    });

    it('returns error for non-existent attachment', async () => {
      const tool = getTool('platform.core.attachment_read');
      const result = await tool.handler({ attachment_id: 'non-existent' });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.error);
    });
  });

  describe('attachment_update', () => {
    it('updates an attachment', async () => {
      const attachment = attachmentManager.add({ type: 'text', data: 'v1', description: 'Test' });
      const tool = getTool('platform.core.attachment_update');
      const result = await tool.handler({ attachment_id: attachment.id, data: 'v2' });

      expect((result.results[0] as any).data.__attachment_operation__).toBe('update');
      expect((result.results[0] as any).data.version).toBe(2);
      expect((result.results[0] as any).data.version_created).toBe(true);
    });

    it('returns error for deleted attachment', async () => {
      const attachment = attachmentManager.add({ type: 'text', data: 'v1', description: 'Test' });
      attachmentManager.delete(attachment.id);

      const tool = getTool('platform.core.attachment_update');
      const result = await tool.handler({ attachment_id: attachment.id, data: 'v2' });

      expect(result.results[0].type).toBe(ToolResultType.error);
    });
  });

  describe('attachment_delete', () => {
    it('deletes an attachment', async () => {
      const attachment = attachmentManager.add({
        type: 'text',
        data: 'hello',
        description: 'Test',
      });
      const tool = getTool('platform.core.attachment_delete');
      const result = await tool.handler({ attachment_id: attachment.id });

      expect((result.results[0] as any).data.__attachment_operation__).toBe('delete');
      expect(attachmentManager.get(attachment.id)?.active).toBe(false);
    });

    it('returns error for already deleted attachment', async () => {
      const attachment = attachmentManager.add({
        type: 'text',
        data: 'hello',
        description: 'Test',
      });
      attachmentManager.delete(attachment.id);

      const tool = getTool('platform.core.attachment_delete');
      const result = await tool.handler({ attachment_id: attachment.id });

      expect(result.results[0].type).toBe(ToolResultType.error);
    });
  });

  describe('attachment_restore', () => {
    it('restores a deleted attachment', async () => {
      const attachment = attachmentManager.add({
        type: 'text',
        data: 'hello',
        description: 'Test',
      });
      attachmentManager.delete(attachment.id);

      const tool = getTool('platform.core.attachment_restore');
      const result = await tool.handler({ attachment_id: attachment.id });

      expect((result.results[0] as any).data.__attachment_operation__).toBe('restore');
      expect(attachmentManager.get(attachment.id)?.active).toBe(true);
    });

    it('returns error for non-deleted attachment', async () => {
      const attachment = attachmentManager.add({
        type: 'text',
        data: 'hello',
        description: 'Test',
      });

      const tool = getTool('platform.core.attachment_restore');
      const result = await tool.handler({ attachment_id: attachment.id });

      expect(result.results[0].type).toBe(ToolResultType.error);
    });
  });

  describe('attachment_list', () => {
    it('lists active attachments', async () => {
      attachmentManager.add({ type: 'text', data: 'a1', description: 'Attachment 1' });
      attachmentManager.add({ type: 'json', data: { key: 'value' }, description: 'Attachment 2' });

      const tool = getTool('platform.core.attachment_list');
      const result = await tool.handler({});

      expect((result.results[0] as any).data.__attachment_operation__).toBe('list');
      expect((result.results[0] as any).data.count).toBe(2);
      expect((result.results[0] as any).data.attachments).toHaveLength(2);
    });

    it('includes deleted when requested', async () => {
      const a1 = attachmentManager.add({ type: 'text', data: 'a1', description: 'Attachment 1' });
      attachmentManager.add({ type: 'text', data: 'a2', description: 'Attachment 2' });
      attachmentManager.delete(a1.id);

      const tool = getTool('platform.core.attachment_list');
      const resultActive = await tool.handler({});
      const resultAll = await tool.handler({ include_deleted: true });

      expect((resultActive.results[0] as any).data.count).toBe(1);
      expect((resultAll.results[0] as any).data.count).toBe(2);
    });
  });

  describe('attachment_diff', () => {
    it('computes diff between versions', async () => {
      const attachment = attachmentManager.add({
        type: 'text',
        data: 'version 1',
        description: 'Test',
      });
      attachmentManager.update(attachment.id, { data: 'version 2' });

      const tool = getTool('platform.core.attachment_diff');
      const result = await tool.handler({
        attachment_id: attachment.id,
        from_version: 1,
        to_version: 2,
      });

      expect((result.results[0] as any).data.__attachment_operation__).toBe('diff');
      expect((result.results[0] as any).data.from_data).toBe('version 1');
      expect((result.results[0] as any).data.to_data).toBe('version 2');
    });

    it('returns error for non-existent attachment', async () => {
      const tool = getTool('platform.core.attachment_diff');
      const result = await tool.handler({
        attachment_id: 'non-existent',
        from_version: 1,
        to_version: 2,
      });

      expect(result.results[0].type).toBe(ToolResultType.error);
    });
  });
});
