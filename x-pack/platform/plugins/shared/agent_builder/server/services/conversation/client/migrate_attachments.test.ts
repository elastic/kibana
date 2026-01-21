/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStatus, type ConversationRound } from '@kbn/agent-builder-common';
import { AttachmentType, type Attachment } from '@kbn/agent-builder-common/attachments';
import { hashContent } from '@kbn/agent-builder-common/attachments';
import {
  needsMigration,
  migrateRoundAttachments,
  createAttachmentRefs,
  getAllLegacyAttachments,
} from './migrate_attachments';

const createMockRound = (
  attachments?: Attachment[],
  startedAt: string = '2024-01-01T00:00:00.000Z'
): ConversationRound => ({
  id: `round-${Math.random().toString(36).substr(2, 9)}`,
  status: ConversationRoundStatus.completed,
  input: {
    message: 'test message',
    ...(attachments && { attachments }),
  },
  steps: [],
  response: { message: 'response' },
  started_at: startedAt,
  time_to_first_token: 100,
  time_to_last_token: 500,
  model_usage: {
    connector_id: 'connector-1',
    llm_calls: 1,
    input_tokens: 10,
    output_tokens: 20,
  },
});

const createMockAttachment = (overrides: Partial<Attachment> = {}): Attachment => ({
  id: `attachment-${Math.random().toString(36).substr(2, 9)}`,
  type: AttachmentType.text,
  data: { content: 'test content' },
  ...overrides,
});

describe('migrate_attachments', () => {
  describe('needsMigration', () => {
    it('returns false when conversation already has versioned attachments', () => {
      const rounds = [createMockRound([createMockAttachment()])];
      expect(needsMigration(true, rounds)).toBe(false);
    });

    it('returns false when no attachments anywhere', () => {
      const rounds = [createMockRound(), createMockRound()];
      expect(needsMigration(false, rounds)).toBe(false);
    });

    it('returns true when rounds have attachments but no versioned attachments', () => {
      const rounds = [createMockRound([createMockAttachment()])];
      expect(needsMigration(false, rounds)).toBe(true);
    });

    it('returns true when only some rounds have attachments', () => {
      const rounds = [
        createMockRound(),
        createMockRound([createMockAttachment()]),
        createMockRound(),
      ];
      expect(needsMigration(false, rounds)).toBe(true);
    });

    it('returns false for empty rounds array', () => {
      expect(needsMigration(false, [])).toBe(false);
    });
  });

  describe('migrateRoundAttachments', () => {
    it('returns empty array for rounds with no attachments', () => {
      const rounds = [createMockRound(), createMockRound()];
      const result = migrateRoundAttachments(rounds);
      expect(result).toEqual([]);
    });

    it('creates versioned attachment from single round', () => {
      const attachment = createMockAttachment({
        id: 'att-1',
        type: AttachmentType.text,
        data: { content: 'hello' },
      });
      const rounds = [createMockRound([attachment], '2024-01-15T10:00:00.000Z')];

      const result = migrateRoundAttachments(rounds);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'att-1',
        type: 'text',
        current_version: 1,
        active: true,
        client_id: 'att-1',
      });
      expect(result[0].versions).toHaveLength(1);
      expect(result[0].versions[0]).toMatchObject({
        version: 1,
        data: { content: 'hello' },
        created_at: '2024-01-15T10:00:00.000Z',
      });
    });

    it('deduplicates identical attachments across rounds', () => {
      const data = { content: 'same content' };
      const attachment1 = createMockAttachment({ id: 'att-1', type: 'text', data });
      const attachment2 = createMockAttachment({ id: 'att-2', type: 'text', data });

      const rounds = [
        createMockRound([attachment1], '2024-01-01T00:00:00.000Z'),
        createMockRound([attachment2], '2024-01-02T00:00:00.000Z'),
      ];

      const result = migrateRoundAttachments(rounds);

      // Should only have one attachment (deduplicated by content hash)
      expect(result).toHaveLength(1);
      // Should use the first occurrence's ID and timestamp
      expect(result[0].id).toBe('att-1');
      expect(result[0].versions[0].created_at).toBe('2024-01-01T00:00:00.000Z');
    });

    it('preserves earliest timestamp for deduplicated attachments', () => {
      const data = { content: 'same content' };
      const rounds = [
        createMockRound([createMockAttachment({ id: 'att-2', data })], '2024-06-15T00:00:00.000Z'),
        createMockRound([createMockAttachment({ id: 'att-1', data })], '2024-01-01T00:00:00.000Z'),
      ];

      const result = migrateRoundAttachments(rounds);

      expect(result).toHaveLength(1);
      // Should use the first encountered timestamp (June, not January)
      expect(result[0].versions[0].created_at).toBe('2024-06-15T00:00:00.000Z');
    });

    it('handles different attachment types separately', () => {
      const rounds = [
        createMockRound([
          createMockAttachment({
            id: 'att-1',
            type: AttachmentType.text,
            data: { content: 'content' },
          }),
          createMockAttachment({ id: 'att-2', type: 'json', data: { key: 'value' } }),
        ]),
      ];

      const result = migrateRoundAttachments(rounds);

      expect(result).toHaveLength(2);
      expect(result.map((a) => a.type)).toContain('text');
      expect(result.map((a) => a.type)).toContain('json');
    });

    it('generates UUID when attachment has no ID', () => {
      const attachment = {
        type: AttachmentType.text,
        data: { content: 'no id' },
      } as unknown as Attachment;
      const rounds = [createMockRound([attachment])];

      const result = migrateRoundAttachments(rounds);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBeDefined();
      expect(result[0].id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(result[0].client_id).toBeUndefined(); // No client_id since original had no id
    });

    it('preserves existing attachment IDs', () => {
      const attachment = createMockAttachment({ id: 'my-custom-id' });
      const rounds = [createMockRound([attachment])];

      const result = migrateRoundAttachments(rounds);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('my-custom-id');
      expect(result[0].client_id).toBe('my-custom-id');
    });

    it('computes content hash correctly', () => {
      const data = { complex: 'object', with: ['array'] };
      const attachment = createMockAttachment({ data });
      const rounds = [createMockRound([attachment])];

      const result = migrateRoundAttachments(rounds);

      expect(result[0].versions[0].content_hash).toBe(hashContent(data));
    });

    it('estimates tokens for attachment data', () => {
      const data = { content: 'a'.repeat(100) }; // 100 characters
      const attachment = createMockAttachment({ data });
      const rounds = [createMockRound([attachment])];

      const result = migrateRoundAttachments(rounds);

      // ~4 chars per token, so 100 chars ≈ 25 tokens
      expect(result[0].versions[0].estimated_tokens).toBeGreaterThan(0);
    });

    it('preserves hidden flag from legacy attachment', () => {
      const attachment = createMockAttachment({ hidden: true });
      const rounds = [createMockRound([attachment])];

      const result = migrateRoundAttachments(rounds);

      expect(result[0].hidden).toBe(true);
    });

    it('handles multiple attachments in single round', () => {
      const rounds = [
        createMockRound([
          createMockAttachment({ id: 'att-1', data: { content: 'first' } }),
          createMockAttachment({ id: 'att-2', data: { content: 'second' } }),
          createMockAttachment({ id: 'att-3', data: { content: 'third' } }),
        ]),
      ];

      const result = migrateRoundAttachments(rounds);

      expect(result).toHaveLength(3);
    });

    it('handles empty attachments array in round', () => {
      const rounds = [
        {
          ...createMockRound(),
          input: { message: 'test', attachments: [] },
        },
      ];

      const result = migrateRoundAttachments(rounds);

      expect(result).toEqual([]);
    });
  });

  describe('createAttachmentRefs', () => {
    it('creates refs matching content hashes', () => {
      const data = { content: 'test content' };
      const attachment = createMockAttachment({ id: 'legacy-1', type: AttachmentType.text, data });
      const rounds = [createMockRound([attachment])];

      const versionedAttachments = migrateRoundAttachments(rounds);
      const refs = createAttachmentRefs(rounds, versionedAttachments);

      expect(refs.size).toBe(1);
      expect(refs.get(0)).toEqual([{ attachment_id: 'legacy-1', version: 1 }]);
    });

    it('handles attachments not found in versioned list', () => {
      const attachment = createMockAttachment({ data: { content: 'orphan content' } });
      const rounds = [createMockRound([attachment])];

      // Empty versioned attachments - nothing to reference
      const refs = createAttachmentRefs(rounds, []);

      expect(refs.size).toBe(0);
    });

    it('creates refs for multiple rounds', () => {
      const data1 = { content: 'content 1' };
      const data2 = { content: 'content 2' };
      const attachment1 = createMockAttachment({ id: 'att-1', data: data1 });
      const attachment2 = createMockAttachment({ id: 'att-2', data: data2 });

      const rounds = [createMockRound([attachment1]), createMockRound([attachment2])];

      const versionedAttachments = migrateRoundAttachments(rounds);
      const refs = createAttachmentRefs(rounds, versionedAttachments);

      expect(refs.size).toBe(2);
      expect(refs.get(0)).toHaveLength(1);
      expect(refs.get(1)).toHaveLength(1);
    });

    it('handles deduplicated attachments correctly', () => {
      const data = { content: 'same content' };
      const attachment1 = createMockAttachment({ id: 'att-1', data });
      const attachment2 = createMockAttachment({ id: 'att-2', data });

      const rounds = [createMockRound([attachment1]), createMockRound([attachment2])];

      const versionedAttachments = migrateRoundAttachments(rounds);
      const refs = createAttachmentRefs(rounds, versionedAttachments);

      // Both rounds should reference the same (deduplicated) attachment
      expect(refs.size).toBe(2);
      expect(refs.get(0)?.[0].attachment_id).toBe(refs.get(1)?.[0].attachment_id);
    });
  });

  describe('getAllLegacyAttachments', () => {
    it('returns empty array for rounds without attachments', () => {
      const rounds = [createMockRound(), createMockRound()];
      const result = getAllLegacyAttachments(rounds);
      expect(result).toEqual([]);
    });

    it('returns all attachments from all rounds (without deduplication)', () => {
      const data = { content: 'same content' };
      const attachment1 = createMockAttachment({ id: 'att-1', data });
      const attachment2 = createMockAttachment({ id: 'att-2', data });
      const attachment3 = createMockAttachment({ id: 'att-3', data: { content: 'different' } });

      const rounds = [createMockRound([attachment1, attachment2]), createMockRound([attachment3])];

      const result = getAllLegacyAttachments(rounds);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual(attachment1);
      expect(result).toContainEqual(attachment2);
      expect(result).toContainEqual(attachment3);
    });
  });
});
