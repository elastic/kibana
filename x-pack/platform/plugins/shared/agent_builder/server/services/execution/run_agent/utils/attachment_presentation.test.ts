/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  prepareAttachmentPresentation,
  getConversationAttachmentsSection,
  getConversationAttachmentsSystemMessages,
} from './attachment_presentation';

const createMockAttachment = (
  id: string,
  type: string,
  data: unknown,
  options: { active?: boolean; description?: string; estimatedTokens?: number } = {}
): VersionedAttachment => ({
  id,
  type,
  versions: [
    {
      version: 1,
      data,
      created_at: new Date().toISOString(),
      content_hash: 'hash123',
      estimated_tokens: options.estimatedTokens ?? 100,
    },
  ],
  current_version: 1,
  active: options.active ?? true,
  description: options.description,
});

describe('attachment_presentation', () => {
  describe('prepareAttachmentPresentation', () => {
    it('should return empty content for no attachments', async () => {
      const result = await prepareAttachmentPresentation([]);

      expect(result.content).toBe('');
      expect(result.activeCount).toBe(0);
    });

    it('should return summary-only metadata for a single attachment', async () => {
      const attachments = [
        createMockAttachment('1', 'text', 'Hello world', {
          description: 'Test',
          estimatedTokens: 42,
        }),
      ];

      const result = await prepareAttachmentPresentation(attachments);

      expect(result.activeCount).toBe(1);
      expect(result.content).toContain('count="1"');
      expect(result.content).toContain('attachment_id="1"');
      expect(result.content).toContain('version="1"');
      expect(result.content).toContain('estimated_tokens="42"');
      expect(result.content).toContain('description="Test"');
      // Content is never inlined, regardless of count.
      expect(result.content).not.toContain('Hello world');
    });

    it('should always present as summary metadata regardless of attachment count (no threshold)', async () => {
      const few = [
        createMockAttachment('1', 'text', 'Content 1'),
        createMockAttachment('2', 'text', 'Content 2'),
        createMockAttachment('3', 'text', 'Content 3'),
      ];
      const many = Array.from({ length: 6 }, (_, i) =>
        createMockAttachment(`${i}`, 'text', `Content ${i}`)
      );

      const fewResult = await prepareAttachmentPresentation(few);
      const manyResult = await prepareAttachmentPresentation(many);

      expect(fewResult.content).not.toContain('Content 1');
      expect(fewResult.activeCount).toBe(3);
      expect(manyResult.content).not.toContain('Content 0');
      expect(manyResult.activeCount).toBe(6);
    });

    it('should exclude deleted attachments from count', async () => {
      const attachments = [
        createMockAttachment('1', 'text', 'Active', { active: true }),
        createMockAttachment('2', 'text', 'Deleted', { active: false }),
        createMockAttachment('3', 'text', 'Active 2', { active: true }),
      ];

      const result = await prepareAttachmentPresentation(attachments);

      expect(result.activeCount).toBe(2);
      expect(result.content).toContain('count="2"');
    });

    it('should include description in XML attributes', async () => {
      const attachments = [
        createMockAttachment('1', 'text', 'Content', { description: 'My notes' }),
      ];

      const result = await prepareAttachmentPresentation(attachments);

      expect(result.content).toContain('description="My notes"');
    });

    it('should escape XML special characters in description', async () => {
      const attachments = [
        createMockAttachment('1', 'text', 'Content', { description: 'Test <>&"\'' }),
      ];

      const result = await prepareAttachmentPresentation(attachments);

      expect(result.content).toContain('&lt;');
      expect(result.content).toContain('&gt;');
      expect(result.content).toContain('&amp;');
    });
  });

  describe('getConversationAttachmentsSection', () => {
    it('should return empty string when presentation is undefined', () => {
      expect(getConversationAttachmentsSection(undefined)).toBe('');
    });

    it('should return empty string for no attachments', async () => {
      const presentation = await prepareAttachmentPresentation([]);
      expect(getConversationAttachmentsSection(presentation)).toBe('');
    });

    it('should always return the summary instructions', async () => {
      const attachments = [createMockAttachment('1', 'text', 'Content')];
      const presentation = await prepareAttachmentPresentation(attachments);
      const section = getConversationAttachmentsSection(presentation);

      expect(section).toContain('1 attachment');
      expect(section).toContain('MUST use attachment tools');
      expect(section).toContain('attachment_read');
      expect(section).toContain('attachment_list');
      expect(section).toContain('Always read an attachment before referencing');
    });

    it('should return the summary instructions for many attachments too', async () => {
      const attachments = Array.from({ length: 6 }, (_, i) =>
        createMockAttachment(`${i}`, 'text', `Content ${i}`)
      );
      const presentation = await prepareAttachmentPresentation(attachments);
      const section = getConversationAttachmentsSection(presentation);

      expect(section).toContain('6 attachment');
      expect(section).toContain('MUST use attachment tools');
      expect(section).toContain('attachment_read');
    });

    it('should never emit the old inline-only text', async () => {
      const attachments = [createMockAttachment('1', 'text', 'Content')];
      const presentation = await prepareAttachmentPresentation(attachments);
      const section = getConversationAttachmentsSection(presentation);

      expect(section).not.toContain('content is shown below in XML format');
      expect(section).not.toContain('content truncated');
    });

    it('should place the XML content between preamble and instructions', async () => {
      const attachments = [createMockAttachment('1', 'text', 'Hello world')];
      const presentation = await prepareAttachmentPresentation(attachments);
      const section = getConversationAttachmentsSection(presentation);

      const titleIndex = section.indexOf('## Conversation Attachments');
      const xmlIndex = section.indexOf('<conversation-attachments');
      const instructionsIndex = section.indexOf('You MUST use attachment tools');

      expect(titleIndex).toBeGreaterThanOrEqual(0);
      expect(xmlIndex).toBeGreaterThan(titleIndex);
      expect(instructionsIndex).toBeGreaterThan(xmlIndex);
    });
  });

  describe('getConversationAttachmentsSystemMessages', () => {
    it('should return empty array when there are no attachments', async () => {
      const presentation = await prepareAttachmentPresentation([]);
      expect(getConversationAttachmentsSystemMessages(presentation)).toEqual([]);
    });

    it('should wrap the summary section content as a system message', async () => {
      const attachments = [createMockAttachment('1', 'text', 'Content')];
      const presentation = await prepareAttachmentPresentation(attachments);
      const messages = getConversationAttachmentsSystemMessages(presentation);

      expect(messages).toHaveLength(1);
      const [role, content] = messages[0] as [string, string];
      expect(role).toBe('system');
      expect(content).toBe(getConversationAttachmentsSection(presentation));
      expect(content).toContain('MUST use attachment tools');
    });

    it('should wrap the summary section for many attachments as a system message', async () => {
      const attachments = Array.from({ length: 6 }, (_, i) =>
        createMockAttachment(`${i}`, 'text', `Content ${i}`)
      );
      const presentation = await prepareAttachmentPresentation(attachments);
      const messages = getConversationAttachmentsSystemMessages(presentation);

      expect(messages).toHaveLength(1);
      const [role, content] = messages[0] as [string, string];
      expect(role).toBe('system');
      expect(content).toContain('count="6"');
    });
  });
});
