/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { formatAttachmentsMetadata } from './attachment_presentation';

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

describe('formatAttachmentsMetadata', () => {
  it('should return an empty string for no attachments', () => {
    expect(formatAttachmentsMetadata([])).toBe('');
  });

  it('should render summary-only metadata for a single attachment', () => {
    const attachments = [
      createMockAttachment('1', 'text', 'Hello world', {
        description: 'Test',
        estimatedTokens: 42,
      }),
    ];

    const result = formatAttachmentsMetadata(attachments);

    expect(result).toContain('count="1"');
    expect(result).toContain('attachment_id="1"');
    expect(result).toContain('type="text"');
    expect(result).toContain('version="1"');
    expect(result).toContain('estimated_tokens="42"');
    expect(result).toContain('description="Test"');
    // Content is never inlined, regardless of count — only metadata.
    expect(result).not.toContain('Hello world');
  });

  it('should render metadata for multiple attachments regardless of count (no threshold)', () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      createMockAttachment(`${i}`, 'text', `Content ${i}`)
    );

    const result = formatAttachmentsMetadata(many);

    expect(result).toContain('count="6"');
    expect(result).not.toContain('Content 0');
    for (let i = 0; i < 6; i++) {
      expect(result).toContain(`attachment_id="${i}"`);
    }
  });

  it('should not filter by active/deleted — callers decide which attachments to pass', () => {
    // formatAttachmentsMetadata is a pure formatter now; filtering is the caller's job.
    const attachments = [createMockAttachment('1', 'text', 'Deleted', { active: false })];

    const result = formatAttachmentsMetadata(attachments);

    expect(result).toContain('attachment_id="1"');
  });

  it('should include description in XML attributes', () => {
    const attachments = [createMockAttachment('1', 'text', 'Content', { description: 'My notes' })];

    const result = formatAttachmentsMetadata(attachments);

    expect(result).toContain('description="My notes"');
  });

  it('should escape XML special characters in description', () => {
    const attachments = [
      createMockAttachment('1', 'text', 'Content', { description: 'Test <>&"\'' }),
    ];

    const result = formatAttachmentsMetadata(attachments);

    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&amp;');
  });
});
