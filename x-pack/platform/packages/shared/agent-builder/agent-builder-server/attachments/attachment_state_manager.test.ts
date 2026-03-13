/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
  hashContent,
  getLatestVersion,
  getVersion,
} from '@kbn/agent-builder-common/attachments';
import {
  createAttachmentStateManager,
  type AttachmentStateManager,
} from './attachment_state_manager';
import type { AttachmentTypeDefinition } from './type_definition';

describe('AttachmentStateManager', () => {
  let manager: AttachmentStateManager;
  const mockContext = { request: {} as any, spaceId: 'default' };

  let resolvedByRefPayload: Record<string, unknown> = { value: 'resolved-1' };

  const getTypeDefinition = (type: string): AttachmentTypeDefinition | undefined => {
    switch (type) {
      case 'text':
        return {
          id: 'text',
          validate: (input: unknown) => {
            if (
              typeof input === 'object' &&
              input !== null &&
              typeof (input as any).content === 'string'
            ) {
              return { valid: true, data: input as any };
            }
            return { valid: false, error: 'Expected { content: string }' };
          },
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
        } as any;
      case 'screen_context':
        return {
          id: 'screen_context',
          validate: (input: unknown) => {
            if (typeof input !== 'object' || input === null) {
              return { valid: false, error: 'Expected object' };
            }
            const data = input as Record<string, unknown>;
            if (
              data.url === undefined &&
              data.app === undefined &&
              data.description === undefined &&
              data.additional_data === undefined
            ) {
              return { valid: false, error: 'Expected at least one field to be present' };
            }
            return { valid: true, data: input as any };
          },
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
        } as any;
      case 'esql':
        return {
          id: 'esql',
          validate: (input: unknown) => {
            if (
              typeof input === 'object' &&
              input !== null &&
              typeof (input as any).query === 'string'
            ) {
              return { valid: true, data: input as any };
            }
            return { valid: false, error: 'Expected { query: string }' };
          },
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
        } as any;
      case 'by_ref':
        return {
          id: 'by_ref',
          validate: (input: unknown) => {
            if (
              typeof input === 'object' &&
              input !== null &&
              typeof (input as any).ref === 'string'
            ) {
              return { valid: true, data: input as any };
            }
            return { valid: false, error: 'Expected { ref: string }' };
          },
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
          resolve: async () => resolvedByRefPayload,
        } as any;
      default:
        return undefined;
    }
  };

  beforeEach(() => {
    manager = createAttachmentStateManager([], { getTypeDefinition });
    resolvedByRefPayload = { value: 'resolved-1' };
  });

  // Helper to create a test attachment
  const createTestAttachment = (
    overrides: Partial<VersionedAttachment> = {}
  ): VersionedAttachment => ({
    id: 'test-att-1',
    type: 'text',
    versions: [
      {
        version: 1,
        data: { content: 'Hello' },
        created_at: '2025-01-01T00:00:00Z',
        content_hash: hashContent({ content: 'Hello' }),
        estimated_tokens: 5,
      },
    ],
    current_version: 1,
    active: true,
    ...overrides,
  });

  describe('add()', () => {
    it('creates a new attachment with version 1', async () => {
      const attachment = await manager.add({
        type: 'text',
        data: { content: 'Hello World' },
        description: 'My attachment',
      });

      expect(attachment.id).toBeDefined();
      expect(attachment.type).toBe('text');
      expect(attachment.current_version).toBe(1);
      expect(attachment.versions).toHaveLength(1);
      expect(attachment.versions[0].version).toBe(1);
      expect(attachment.versions[0].data).toEqual({ content: 'Hello World' });
      expect(attachment.description).toBe('My attachment');
      expect(attachment.active).toBe(true);
    });

    it('uses explicit ID when provided', async () => {
      const attachment = await manager.add({
        id: 'custom-id-123',
        type: 'text',
        data: { content: 'Test' },
      });

      expect(attachment.id).toBe('custom-id-123');
    });

    it('generates UUID when ID not provided', async () => {
      const attachment = await manager.add({
        type: 'text',
        data: { content: 'Test' },
      });

      // UUID format check
      expect(attachment.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('computes content hash', async () => {
      const data = { content: 'Test content' };
      const attachment = await manager.add({
        type: 'text',
        data,
      });

      expect(attachment.versions[0].content_hash).toBe(hashContent(data));
    });

    it('estimates tokens', async () => {
      const attachment = await manager.add({
        type: 'text',
        data: { content: 'a'.repeat(100) }, // ~100 chars
      });

      expect(attachment.versions[0].estimated_tokens).toBeGreaterThan(0);
    });

    it('sets hidden flag when provided', async () => {
      const attachment = await manager.add({
        type: 'screen_context',
        data: { url: 'http://example.com' },
        hidden: true,
      });

      expect(attachment.hidden).toBe(true);
    });

    it('marks state as dirty', async () => {
      expect(manager.hasChanges()).toBe(false);

      await manager.add({ type: 'text', data: { content: 'Test' } });

      expect(manager.hasChanges()).toBe(true);
    });

    it('throws when adding invalid data for a built-in type', async () => {
      await expect(manager.add({ type: 'text', data: {} as any })).rejects.toThrow(
        'Invalid attachment data for type "text"'
      );
    });
  });

  describe('get()', () => {
    it('returns the attachment by ID', async () => {
      const added = await manager.add({ id: 'test-1', type: 'text', data: { content: 'Test' } });

      const retrieved = manager.get('test-1');

      expect(retrieved?.id).toEqual('test-1');
      expect(retrieved?.data.data).toEqual(added.versions[0].data);
    });

    it('returns undefined for non-existent ID', () => {
      const result = manager.get('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getLatest()', () => {
    it('returns the current version', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'v1' } });
      await manager.update('test-1', { data: { content: 'v2' } });

      const record = manager.getAttachmentRecord('test-1')!;
      const latest = getLatestVersion(record);

      expect(latest?.version).toBe(2);
      expect(latest?.data).toEqual({ content: 'v2' });
    });

    it('returns undefined for non-existent attachment', () => {
      const record = manager.getAttachmentRecord('non-existent');
      expect(record).toBeUndefined();
    });
  });

  describe('getVersion()', () => {
    it('retrieves specific version by number', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'v1' } });
      await manager.update('test-1', { data: { content: 'v2' } });
      await manager.update('test-1', { data: { content: 'v3' } });

      const record = manager.getAttachmentRecord('test-1')!;
      const v2 = getVersion(record, 2);

      expect(v2?.version).toBe(2);
      expect(v2?.data).toEqual({ content: 'v2' });
    });

    it('returns undefined for non-existent version', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'v1' } });

      const record = manager.getAttachmentRecord('test-1')!;
      expect(getVersion(record, 99)).toBeUndefined();
    });
  });

  describe('getActive()', () => {
    it('filters out deleted attachments', async () => {
      await manager.add({ id: 'active-1', type: 'text', data: { content: 'Active 1' } });
      await manager.add({ id: 'active-2', type: 'text', data: { content: 'Active 2' } });
      await manager.add({ id: 'deleted-1', type: 'text', data: { content: 'Deleted' } });

      manager.delete('deleted-1');

      const active = manager.getActive();

      expect(active).toHaveLength(2);
      expect(active.map((a) => a.id)).toEqual(['active-1', 'active-2']);
    });

    it('returns empty array when all deleted', async () => {
      await manager.add({ id: 'att-1', type: 'text', data: { content: 'Test' } });
      manager.delete('att-1');

      expect(manager.getActive()).toHaveLength(0);
    });
  });

  describe('getAll()', () => {
    it('returns all attachments including deleted', async () => {
      await manager.add({ id: 'active-1', type: 'text', data: { content: 'Active' } });
      await manager.add({ id: 'deleted-1', type: 'text', data: { content: 'Deleted' } });
      manager.delete('deleted-1');

      const all = manager.getAll();

      expect(all).toHaveLength(2);
      expect(all.map((a) => a.id).sort()).toEqual(['active-1', 'deleted-1']);
    });
  });

  describe('update()', () => {
    it('creates new version when content changes', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'v1' } });

      const updated = await manager.update('test-1', { data: { content: 'v2' } });

      expect(updated?.current_version).toBe(2);
      expect(updated?.versions).toHaveLength(2);
      expect(updated?.versions[1].data).toEqual({ content: 'v2' });
    });

    it('does NOT create new version when content is identical', async () => {
      const data = { content: 'same content' };
      await manager.add({ id: 'test-1', type: 'text', data });

      const updated = await manager.update('test-1', { data });

      expect(updated?.current_version).toBe(1);
      expect(updated?.versions).toHaveLength(1);
    });

    it('updates description without creating new version', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });

      const updated = await manager.update('test-1', { description: 'New description' });

      expect(updated?.description).toBe('New description');
      expect(updated?.current_version).toBe(1);
      expect(updated?.versions).toHaveLength(1);
    });

    it('updates hidden without creating new version', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'test' }, hidden: false });

      const updated = await manager.update('test-1', { hidden: true });

      expect(updated?.hidden).toBe(true);
      expect(updated?.current_version).toBe(1);
    });

    it('returns undefined for non-existent attachment', async () => {
      await expect(manager.update('non-existent', { data: {} })).resolves.toBeUndefined();
    });

    it('marks state as dirty', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'v1' } });
      manager.markClean();

      await manager.update('test-1', { data: { content: 'v2' } });

      expect(manager.hasChanges()).toBe(true);
    });

    it('throws when updating invalid data for a built-in type', async () => {
      await manager.add({
        id: 'test-1',
        type: 'screen_context',
        data: { url: 'http://example.com' },
      });
      await expect(manager.update('test-1', { data: {} as any })).rejects.toThrow(
        'Invalid attachment data for type "screen_context"'
      );
    });
  });

  describe('delete()', () => {
    it('sets active to false', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });

      const result = manager.delete('test-1');
      const attachment = manager.getAttachmentRecord('test-1');

      expect(result).toBe(true);
      expect(attachment?.active).toBe(false);
    });

    it('returns false for already deleted attachment', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });
      manager.delete('test-1');

      const result = manager.delete('test-1');

      expect(result).toBe(false);
    });

    it('returns false for non-existent attachment', () => {
      expect(manager.delete('non-existent')).toBe(false);
    });

    it('marks state as dirty', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });
      manager.markClean();

      manager.delete('test-1');

      expect(manager.hasChanges()).toBe(true);
    });
  });

  describe('restore()', () => {
    it('sets active back to true', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });
      manager.delete('test-1');

      const result = manager.restore('test-1');
      const attachment = manager.getAttachmentRecord('test-1');

      expect(result).toBe(true);
      expect(attachment?.active).toBe(true);
    });

    it('returns false for already active attachment', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });

      const result = manager.restore('test-1');

      expect(result).toBe(false);
    });

    it('returns false for non-existent attachment', () => {
      expect(manager.restore('non-existent')).toBe(false);
    });

    it('marks state as dirty', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });
      manager.delete('test-1');
      manager.markClean();

      manager.restore('test-1');

      expect(manager.hasChanges()).toBe(true);
    });
  });

  describe('permanentDelete()', () => {
    it('removes attachment completely', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });

      const result = manager.permanentDelete('test-1');

      expect(result).toBe(true);
      expect(manager.getAttachmentRecord('test-1')).toBeUndefined();
      expect(manager.getAll()).toHaveLength(0);
    });

    it('returns false for non-existent attachment', () => {
      expect(manager.permanentDelete('non-existent')).toBe(false);
    });

    it('marks state as dirty', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });
      manager.markClean();

      manager.permanentDelete('test-1');

      expect(manager.hasChanges()).toBe(true);
    });
  });

  describe('rename()', () => {
    it('updates description without creating new version', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });

      const result = manager.rename('test-1', 'New Name');
      const attachment = manager.getAttachmentRecord('test-1');

      expect(result).toBe(true);
      expect(attachment?.description).toBe('New Name');
      expect(attachment?.current_version).toBe(1);
    });

    it('returns false for non-existent attachment', () => {
      expect(manager.rename('non-existent', 'Name')).toBe(false);
    });

    it('marks state as dirty', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });
      manager.markClean();

      manager.rename('test-1', 'New Name');

      expect(manager.hasChanges()).toBe(true);
    });
  });

  describe('getDiff()', () => {
    it('returns update diff when content changes', async () => {
      await manager.add({
        id: 'test-1',
        type: 'text',
        data: { content: 'v1' },
        description: 'Test',
      });
      await manager.update('test-1', { data: { content: 'v2' } });

      const diff = manager.getDiff('test-1', 1, 2);

      expect(diff?.change_type).toBe('update');
      expect(diff?.summary).toContain('Updated');
      expect(diff?.changed_fields).toContain('data');
    });

    it('returns undefined for non-existent attachment', () => {
      expect(manager.getDiff('non-existent', 1, 2)).toBeUndefined();
    });

    it('returns undefined for non-existent versions', async () => {
      await manager.add({ id: 'test-1', type: 'text', data: { content: 'v1' } });

      expect(manager.getDiff('test-1', 1, 99)).toBeUndefined();
    });
  });

  describe('resolveRefs()', () => {
    it('returns correct attachment versions', async () => {
      await manager.add({ id: 'att-1', type: 'text', data: { content: 'v1' } });
      await manager.update('att-1', { data: { content: 'v2' } });
      await manager.add({ id: 'att-2', type: 'esql', data: { query: 'SELECT *' } });

      const refs: AttachmentVersionRef[] = [
        { attachment_id: 'att-1', version: 1 },
        { attachment_id: 'att-2', version: 1 },
      ];

      const resolved = manager.resolveRefs(refs);

      expect(resolved).toHaveLength(2);
      expect(resolved[0].id).toBe('att-1');
      expect(resolved[0].version.data).toEqual({ content: 'v1' });
      expect(resolved[1].id).toBe('att-2');
      expect(resolved[1].version.data).toEqual({ query: 'SELECT *' });
    });

    it('skips non-existent attachments', async () => {
      await manager.add({ id: 'att-1', type: 'text', data: { content: 'test' } });

      const refs: AttachmentVersionRef[] = [
        { attachment_id: 'att-1', version: 1 },
        { attachment_id: 'non-existent', version: 1 },
      ];

      const resolved = manager.resolveRefs(refs);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].id).toBe('att-1');
    });

    it('skips non-existent versions', async () => {
      await manager.add({ id: 'att-1', type: 'text', data: { content: 'test' } });

      const refs: AttachmentVersionRef[] = [{ attachment_id: 'att-1', version: 99 }];

      const resolved = manager.resolveRefs(refs);

      expect(resolved).toHaveLength(0);
    });

    it('includes active status in resolved refs', async () => {
      await manager.add({ id: 'att-1', type: 'text', data: { content: 'test' } });
      manager.delete('att-1');

      const refs: AttachmentVersionRef[] = [{ attachment_id: 'att-1', version: 1 }];

      const resolved = manager.resolveRefs(refs);

      expect(resolved[0].active).toBe(false);
    });
  });

  describe('add() with origin', () => {
    it('resolves content from origin at add time and stores origin', async () => {
      const attachment = await manager.add(
        {
          id: 'by-ref-1',
          type: 'by_ref',
          origin: { ref: 'a' },
        },
        undefined,
        mockContext
      );

      // Content should be the resolved payload
      expect(attachment.versions[0].data).toEqual({ value: 'resolved-1' });
      // Origin should be stored on the attachment
      expect(attachment.origin).toEqual({ ref: 'a' });
      expect(attachment.current_version).toBe(1);
    });

    it('reads resolved content directly without re-resolve', async () => {
      const attachment = await manager.add(
        {
          id: 'by-ref-2',
          type: 'by_ref',
          origin: { ref: 'a' },
        },
        undefined,
        mockContext
      );

      // Change the resolve payload — should NOT affect future reads
      resolvedByRefPayload = { value: 'resolved-2' };

      const retrieved = manager.get(attachment.id);
      // Should still be the original resolved content
      expect(retrieved?.data.data).toEqual({ value: 'resolved-1' });
      // Version should not have changed
      expect(manager.getAttachmentRecord(attachment.id)?.current_version).toBe(1);
    });

    it('throws when origin is provided without resolve context', async () => {
      await expect(
        manager.add({
          id: 'by-ref-3',
          type: 'by_ref',
          origin: { ref: 'a' },
        })
      ).rejects.toThrow('Resolve context is required');
    });

    it('throws when neither data nor origin is provided', async () => {
      await expect(
        manager.add({
          id: 'by-ref-4',
          type: 'text',
        } as any)
      ).rejects.toThrow('Either data or origin must be provided');
    });

    it('stores both data and origin when both are provided', async () => {
      const attachment = await manager.add({
        id: 'both-1',
        type: 'by_ref',
        data: { ref: 'custom-data' },
        origin: { ref: 'original-source' },
      });

      expect(attachment.versions[0].data).toEqual({ ref: 'custom-data' });
      expect(attachment.origin).toEqual({ ref: 'original-source' });
    });
  });

  describe('getTotalTokenEstimate()', () => {
    it('sums tokens from all active attachments', async () => {
      // Each attachment will have different estimated tokens based on content size
      await manager.add({ id: 'att-1', type: 'text', data: { content: 'short' } });
      await manager.add({ id: 'att-2', type: 'text', data: { content: 'a'.repeat(100) } });

      const total = manager.getTotalTokenEstimate();

      expect(total).toBeGreaterThan(0);
    });

    it('excludes deleted attachments', async () => {
      await manager.add({ id: 'att-1', type: 'text', data: { content: 'a'.repeat(100) } });
      await manager.add({ id: 'att-2', type: 'text', data: { content: 'b'.repeat(100) } });

      const totalBefore = manager.getTotalTokenEstimate();
      manager.delete('att-2');
      const totalAfter = manager.getTotalTokenEstimate();

      expect(totalAfter).toBeLessThan(totalBefore);
    });

    it('returns 0 for empty state', () => {
      expect(manager.getTotalTokenEstimate()).toBe(0);
    });
  });

  describe('hasChanges()', () => {
    it('returns false initially', () => {
      expect(manager.hasChanges()).toBe(false);
    });

    it('returns true after add', async () => {
      await manager.add({ type: 'text', data: { content: 'Test' } });
      expect(manager.hasChanges()).toBe(true);
    });

    it('returns true after update', async () => {
      await manager.add({ id: 'test', type: 'text', data: { content: 'v1' } });
      manager.markClean();

      await manager.update('test', { data: { content: 'v2' } });

      expect(manager.hasChanges()).toBe(true);
    });

    it('returns true after delete', async () => {
      await manager.add({ id: 'test', type: 'text', data: { content: 'Test' } });
      manager.markClean();

      manager.delete('test');

      expect(manager.hasChanges()).toBe(true);
    });
  });

  describe('markClean()', () => {
    it('resets the dirty flag', async () => {
      await manager.add({ type: 'text', data: { content: 'Test' } });
      expect(manager.hasChanges()).toBe(true);

      manager.markClean();

      expect(manager.hasChanges()).toBe(false);
    });
  });

  describe('access tracking', () => {
    it('records created when adding', async () => {
      const attachment = await manager.add({
        id: 'att-1',
        type: 'text',
        data: { content: 'test' },
      });

      expect(manager.getAccessedRefs()).toEqual([
        {
          attachment_id: attachment.id,
          version: 1,
          operation: ATTACHMENT_REF_OPERATION.created,
          actor: ATTACHMENT_REF_ACTOR.system,
        },
      ]);
    });

    it('records updated on update and does not override created', async () => {
      await manager.add({ id: 'att-1', type: 'text', data: { content: 'v1' } });
      await manager.update('att-1', { data: { content: 'v2' } });

      expect(manager.getAccessedRefs()).toEqual([
        {
          attachment_id: 'att-1',
          version: 1,
          operation: ATTACHMENT_REF_OPERATION.created,
          actor: ATTACHMENT_REF_ACTOR.system,
        },
        {
          attachment_id: 'att-1',
          version: 2,
          operation: ATTACHMENT_REF_OPERATION.updated,
          actor: ATTACHMENT_REF_ACTOR.system,
        },
      ]);
    });

    it('records read via get() with actor', async () => {
      await manager.add({ id: 'att-1', type: 'text', data: { content: 'v1' } });
      manager.clearAccessTracking();

      const latest = manager.get('att-1', { actor: ATTACHMENT_REF_ACTOR.agent });
      const v1 = manager.get('att-1', { version: 1, actor: ATTACHMENT_REF_ACTOR.agent });

      expect(latest?.version).toBe(1);
      expect(v1?.version).toBe(1);
      // After get() calls with actor, read tracking should be recorded
      expect(manager.getAccessedRefs().length).toBeGreaterThanOrEqual(1);
    });

    it('clears access tracking', async () => {
      await manager.add({ id: 'att-1', type: 'text', data: { content: 'v1' } });
      expect(manager.getAccessedRefs()).toHaveLength(1);

      manager.clearAccessTracking();

      expect(manager.getAccessedRefs()).toHaveLength(0);
    });
  });

  describe('initialization with existing attachments', () => {
    it('preserves initial attachments', () => {
      const initial: VersionedAttachment[] = [
        createTestAttachment({ id: 'existing-1' }),
        createTestAttachment({ id: 'existing-2' }),
      ];

      const mgr = createAttachmentStateManager(initial, { getTypeDefinition });

      expect(mgr.getAll()).toHaveLength(2);
      expect(mgr.getAttachmentRecord('existing-1')).toBeDefined();
      expect(mgr.getAttachmentRecord('existing-2')).toBeDefined();
    });

    it('deep clones initial attachments to avoid mutation', () => {
      const initial: VersionedAttachment[] = [createTestAttachment({ id: 'test-1' })];

      const mgr = createAttachmentStateManager(initial, { getTypeDefinition });

      // Mutate original
      initial[0].description = 'mutated';

      // Manager should not be affected
      expect(mgr.getAttachmentRecord('test-1')?.description).toBeUndefined();
    });

    it('starts clean (no changes) when initialized', () => {
      const initial: VersionedAttachment[] = [createTestAttachment()];

      const mgr = createAttachmentStateManager(initial, { getTypeDefinition });

      expect(mgr.hasChanges()).toBe(false);
    });
  });
});
