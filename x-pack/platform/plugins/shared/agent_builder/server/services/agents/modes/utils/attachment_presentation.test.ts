/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  prepareAttachmentPresentation,
  getAttachmentSystemPrompt,
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

      expect(result.mode).toBe('inline');
      expect(result.content).toBe('');
      expect(result.activeCount).toBe(0);
    });

    it('should choose inline mode for few attachments (<=5)', async () => {
      const attachments = [
        createMockAttachment('1', 'text', 'Hello world', { description: 'Test' }),
        createMockAttachment('2', 'json', { key: 'value' }),
        createMockAttachment('3', 'text', 'Another text'),
      ];

      const result = await prepareAttachmentPresentation(attachments);

      expect(result.mode).toBe('inline');
      expect(result.activeCount).toBe(3);
      expect(result.content).toContain('mode="inline"');
      expect(result.content).toContain('count="3"');
      expect(result.content).toContain('Hello world');
    });

    it('should choose summary mode for many attachments (>5)', async () => {
      const attachments = Array.from({ length: 6 }, (_, i) =>
        createMockAttachment(`${i}`, 'text', `Content ${i}`)
      );

      const result = await prepareAttachmentPresentation(attachments);

      expect(result.mode).toBe('summary');
      expect(result.activeCount).toBe(6);
      expect(result.content).toContain('mode="summary"');
      expect(result.content).toContain('Too many attachments');
      expect(result.content).not.toContain('Content 0'); // Data not shown in summary
    });

    it('should allow configurable threshold', async () => {
      const attachments = [
        createMockAttachment('1', 'text', 'Content 1'),
        createMockAttachment('2', 'text', 'Content 2'),
        createMockAttachment('3', 'text', 'Content 3'),
      ];

      const result = await prepareAttachmentPresentation(attachments, { threshold: 2 });

      expect(result.mode).toBe('summary'); // 3 > 2 threshold
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

    it('should truncate large content in inline mode', async () => {
      const largeContent = 'x'.repeat(15000);
      const attachments = [createMockAttachment('1', 'text', largeContent)];

      const result = await prepareAttachmentPresentation(attachments, { maxContentLength: 10000 });

      expect(result.content).toContain('[content truncated');
      expect(result.content.length).toBeLessThan(largeContent.length);
    });

    it('should handle visualization type as JSON', async () => {
      const attachments = [
        createMockAttachment('1', 'visualization', {
          query: 'My Chart',
          visualization: { layers: [] },
          chart_type: 'bar',
          esql: 'FROM index',
        }),
      ];

      const result = await prepareAttachmentPresentation(attachments);

      expect(result.content).toContain('My Chart');
      expect(result.content).toContain('"chart_type"'); // Full JSON stringified content shown
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

    it('should prefer formatted content when formatter is provided', async () => {
      const attachments = [createMockAttachment('1', 'text', 'raw')];
      const formatter = jest.fn(async () => 'formatted content');

      const result = await prepareAttachmentPresentation(attachments, undefined, formatter);

      expect(formatter).toHaveBeenCalledTimes(1);
      expect(result.content).toContain('formatted content');
    });
  });

  describe('getAttachmentSystemPrompt', () => {
    it('should return empty string for no attachments', async () => {
      const presentation = await prepareAttachmentPresentation([]);
      const prompt = getAttachmentSystemPrompt(presentation);

      expect(prompt).toBe('');
    });

    it('should return inline mode instructions with attachment_read guidance', async () => {
      const attachments = [createMockAttachment('1', 'text', 'Content')];
      const presentation = await prepareAttachmentPresentation(attachments);
      const prompt = getAttachmentSystemPrompt(presentation);

      expect(prompt).toContain('1 attachment');
      expect(prompt).toContain('attachment_read');
      expect(prompt).toContain('content truncated');
      expect(prompt).not.toContain('MUST use attachment tools');
    });

    it('should return summary mode instructions', async () => {
      const attachments = Array.from({ length: 6 }, (_, i) =>
        createMockAttachment(`${i}`, 'text', `Content ${i}`)
      );
      const presentation = await prepareAttachmentPresentation(attachments);
      const prompt = getAttachmentSystemPrompt(presentation);

      expect(prompt).toContain('6 attachment');
      expect(prompt).toContain('MUST use attachment tools');
      expect(prompt).toContain('attachment_read');
    });
  });
});
