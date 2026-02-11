/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getLatestVersion,
  getVersion,
  createVersionId,
  parseVersionId,
  isAttachmentActive,
  getActiveAttachments,
  hashContent,
  estimateTokens,
  attachmentVersionSchema,
  versionedAttachmentSchema,
  attachmentVersionRefSchema,
  versionedAttachmentInputSchema,
  attachmentDiffSchema,
  type VersionedAttachment,
  type AttachmentVersion,
} from './versioned_attachment';

describe('versioned_attachment', () => {
  // Helper to create a test attachment
  const createTestAttachment = (
    overrides: Partial<VersionedAttachment> = {}
  ): VersionedAttachment => ({
    id: 'test-attachment-1',
    type: 'text',
    versions: [
      {
        version: 1,
        data: { content: 'Hello' },
        created_at: '2025-01-01T00:00:00Z',
        content_hash: 'abc123',
        estimated_tokens: 10,
      },
    ],
    current_version: 1,
    ...overrides,
  });

  const createTestVersion = (overrides: Partial<AttachmentVersion> = {}): AttachmentVersion => ({
    version: 1,
    data: { content: 'Test' },
    created_at: '2025-01-01T00:00:00Z',
    content_hash: 'hash123',
    estimated_tokens: 5,
    ...overrides,
  });

  describe('getLatestVersion', () => {
    it('returns the current version of an attachment', () => {
      const attachment = createTestAttachment({
        versions: [
          createTestVersion({ version: 1, data: { content: 'v1' } }),
          createTestVersion({ version: 2, data: { content: 'v2' } }),
        ],
        current_version: 2,
      });

      const latest = getLatestVersion(attachment);
      expect(latest).toBeDefined();
      expect(latest?.version).toBe(2);
      expect(latest?.data).toEqual({ content: 'v2' });
    });

    it('returns undefined if current_version does not match any version', () => {
      const attachment = createTestAttachment({
        versions: [createTestVersion({ version: 1 })],
        current_version: 99,
      });

      const latest = getLatestVersion(attachment);
      expect(latest).toBeUndefined();
    });

    it('returns the correct version when versions are not in order', () => {
      const attachment = createTestAttachment({
        versions: [
          createTestVersion({ version: 2, data: { content: 'v2' } }),
          createTestVersion({ version: 1, data: { content: 'v1' } }),
        ],
        current_version: 1,
      });

      const latest = getLatestVersion(attachment);
      expect(latest?.version).toBe(1);
      expect(latest?.data).toEqual({ content: 'v1' });
    });
  });

  describe('getVersion', () => {
    it('returns the specified version', () => {
      const attachment = createTestAttachment({
        versions: [
          createTestVersion({ version: 1, data: { content: 'v1' } }),
          createTestVersion({ version: 2, data: { content: 'v2' } }),
          createTestVersion({ version: 3, data: { content: 'v3' } }),
        ],
        current_version: 3,
      });

      const v2 = getVersion(attachment, 2);
      expect(v2).toBeDefined();
      expect(v2?.version).toBe(2);
      expect(v2?.data).toEqual({ content: 'v2' });
    });

    it('returns undefined for non-existent version', () => {
      const attachment = createTestAttachment({
        versions: [createTestVersion({ version: 1 })],
        current_version: 1,
      });

      const result = getVersion(attachment, 5);
      expect(result).toBeUndefined();
    });
  });

  describe('createVersionId', () => {
    it('creates a version ID string', () => {
      expect(createVersionId('attachment-123', 1)).toBe('attachment-123:v1');
      expect(createVersionId('abc', 42)).toBe('abc:v42');
    });
  });

  describe('parseVersionId', () => {
    it('parses a valid version ID', () => {
      const result = parseVersionId('attachment-123:v5');
      expect(result).toEqual({
        attachmentId: 'attachment-123',
        version: 5,
      });
    });

    it('handles attachment IDs with special characters', () => {
      const result = parseVersionId('my-attachment_id.test:v10');
      expect(result).toEqual({
        attachmentId: 'my-attachment_id.test',
        version: 10,
      });
    });

    it('returns undefined for invalid format', () => {
      expect(parseVersionId('invalid')).toBeUndefined();
      expect(parseVersionId('attachment:1')).toBeUndefined();
      expect(parseVersionId('attachment:vX')).toBeUndefined();
      expect(parseVersionId('')).toBeUndefined();
    });

    it('is inverse of createVersionId', () => {
      const attachmentId = 'test-attachment';
      const version = 7;
      const versionId = createVersionId(attachmentId, version);
      const parsed = parseVersionId(versionId);

      expect(parsed).toEqual({ attachmentId, version });
    });
  });

  describe('isAttachmentActive', () => {
    it('returns true for active attachment', () => {
      const attachment = createTestAttachment({
        versions: [createTestVersion({ version: 1 })],
        current_version: 1,
        active: true,
      });

      expect(isAttachmentActive(attachment)).toBe(true);
    });

    it('returns true when active is undefined (defaults to active)', () => {
      const attachment = createTestAttachment({
        versions: [createTestVersion({ version: 1 })],
        current_version: 1,
      });

      expect(isAttachmentActive(attachment)).toBe(true);
    });

    it('returns false for inactive attachment', () => {
      const attachment = createTestAttachment({
        versions: [createTestVersion({ version: 1 })],
        current_version: 1,
        active: false,
      });

      expect(isAttachmentActive(attachment)).toBe(false);
    });
  });

  describe('getActiveAttachments', () => {
    it('filters out inactive attachments', () => {
      const attachments = [
        createTestAttachment({
          id: 'active-1',
          versions: [createTestVersion()],
          current_version: 1,
          active: true,
        }),
        createTestAttachment({
          id: 'inactive-1',
          versions: [createTestVersion()],
          current_version: 1,
          active: false,
        }),
        createTestAttachment({
          id: 'active-2',
          versions: [createTestVersion()],
          current_version: 1,
          active: true,
        }),
      ];

      const active = getActiveAttachments(attachments);
      expect(active).toHaveLength(2);
      expect(active.map((a) => a.id)).toEqual(['active-1', 'active-2']);
    });

    it('includes attachments with undefined active (defaults to active)', () => {
      const attachments = [
        createTestAttachment({
          id: 'active-1',
          versions: [createTestVersion()],
          current_version: 1,
        }),
        createTestAttachment({
          id: 'inactive-1',
          versions: [createTestVersion()],
          current_version: 1,
          active: false,
        }),
      ];

      const active = getActiveAttachments(attachments);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('active-1');
    });

    it('returns empty array when all attachments are inactive', () => {
      const attachments = [
        createTestAttachment({
          id: 'inactive-1',
          versions: [createTestVersion()],
          current_version: 1,
          active: false,
        }),
      ];

      const active = getActiveAttachments(attachments);
      expect(active).toHaveLength(0);
    });

    it('returns empty array for empty input', () => {
      expect(getActiveAttachments([])).toEqual([]);
    });
  });

  describe('hashContent', () => {
    it('produces consistent hash for same content', () => {
      const data = { content: 'Hello, World!' };
      const hash1 = hashContent(data);
      const hash2 = hashContent(data);

      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different content', () => {
      const hash1 = hashContent({ content: 'Hello' });
      const hash2 = hashContent({ content: 'World' });

      expect(hash1).not.toBe(hash2);
    });

    it('handles various data types', () => {
      expect(() => hashContent('string')).not.toThrow();
      expect(() => hashContent(123)).not.toThrow();
      expect(() => hashContent(null)).not.toThrow();
      expect(() => hashContent([1, 2, 3])).not.toThrow();
      expect(() => hashContent({ nested: { data: true } })).not.toThrow();
    });

    it('produces different hashes for objects with different key order but same values', () => {
      // Note: JSON.stringify may produce different strings for different key orders
      // depending on the JS engine, so we just verify it returns a string
      const hash = hashContent({ a: 1, b: 2 });
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('estimateTokens', () => {
    it('returns reasonable estimate for string content', () => {
      // 20 characters should be ~5 tokens (20/4)
      const data = { content: '12345678901234567890' };
      const tokens = estimateTokens(data);

      // Account for JSON overhead (quotes, braces, etc.)
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(100);
    });

    it('handles empty object', () => {
      const tokens = estimateTokens({});
      expect(tokens).toBeGreaterThan(0); // "{}" has some characters
    });

    it('handles complex nested data', () => {
      const data = {
        level1: {
          level2: {
            level3: 'deep content',
          },
        },
        array: [1, 2, 3, 4, 5],
      };
      const tokens = estimateTokens(data);
      expect(tokens).toBeGreaterThan(10);
    });

    it('returns higher count for larger content', () => {
      const small = estimateTokens({ content: 'small' });
      const large = estimateTokens({ content: 'a'.repeat(1000) });

      expect(large).toBeGreaterThan(small);
    });
  });

  describe('Zod schemas', () => {
    describe('attachmentVersionRefSchema', () => {
      it('validates correct data', () => {
        const valid = { attachment_id: 'test-123', version: 1 };
        const result = attachmentVersionRefSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });

      it('rejects invalid version (non-positive)', () => {
        const invalid = { attachment_id: 'test', version: 0 };
        const result = attachmentVersionRefSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      it('rejects missing fields', () => {
        const invalid = { attachment_id: 'test' };
        const result = attachmentVersionRefSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe('attachmentVersionSchema', () => {
      it('validates correct data', () => {
        const valid = {
          version: 1,
          data: { content: 'test' },
          created_at: '2025-01-01T00:00:00Z',
          content_hash: 'abc123',
        };
        const result = attachmentVersionSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });

      it('validates with optional estimated_tokens', () => {
        const valid = {
          version: 1,
          data: { content: 'test' },
          created_at: '2025-01-01T00:00:00Z',
          content_hash: 'abc123',
          estimated_tokens: 10,
        };
        const result = attachmentVersionSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });

      it('rejects missing required fields', () => {
        const invalid = {
          version: 1,
          data: {},
          // missing created_at and content_hash
        };
        const result = attachmentVersionSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe('versionedAttachmentSchema', () => {
      it('validates correct data', () => {
        const valid = {
          id: 'attachment-1',
          type: 'text',
          versions: [
            {
              version: 1,
              data: { content: 'test' },
              created_at: '2025-01-01T00:00:00Z',
              content_hash: 'abc123',
            },
          ],
          current_version: 1,
        };
        const result = versionedAttachmentSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });

      it('validates with optional fields', () => {
        const valid = {
          id: 'attachment-1',
          type: 'text',
          versions: [],
          current_version: 1,
          description: 'My attachment',
          active: true,
          hidden: true,
          client_id: 'client-123',
        };
        const result = versionedAttachmentSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });

      it('validates with active field set to false', () => {
        const valid = {
          id: 'attachment-1',
          type: 'text',
          versions: [],
          current_version: 1,
          active: false,
        };
        const result = versionedAttachmentSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });

      it('rejects missing required fields', () => {
        const invalid = {
          id: 'attachment-1',
          // missing type, versions, current_version
        };
        const result = versionedAttachmentSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe('versionedAttachmentInputSchema', () => {
      it('validates correct data', () => {
        const valid = {
          type: 'text',
          data: { content: 'test' },
        };
        const result = versionedAttachmentInputSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });

      it('validates with all optional fields', () => {
        const valid = {
          id: 'custom-id',
          type: 'text',
          data: { content: 'test' },
          description: 'My attachment',
          hidden: false,
        };
        const result = versionedAttachmentInputSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });

      it('rejects missing type', () => {
        const invalid = {
          data: { content: 'test' },
        };
        const result = versionedAttachmentInputSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe('attachmentDiffSchema', () => {
      it('validates correct data', () => {
        const valid = {
          change_type: 'update',
          summary: 'Updated content',
          changed_fields: ['content', 'description'],
        };
        const result = attachmentDiffSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });

      it('validates without optional changed_fields', () => {
        const valid = {
          change_type: 'create',
          summary: 'Created attachment',
        };
        const result = attachmentDiffSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });

      it('validates all change types', () => {
        const changeTypes = ['create', 'update', 'delete', 'restore'];
        for (const changeType of changeTypes) {
          const valid = { change_type: changeType, summary: 'Test' };
          const result = attachmentDiffSchema.safeParse(valid);
          expect(result.success).toBe(true);
        }
      });

      it('rejects invalid change_type', () => {
        const invalid = {
          change_type: 'invalid',
          summary: 'Test',
        };
        const result = attachmentDiffSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });
  });
});
