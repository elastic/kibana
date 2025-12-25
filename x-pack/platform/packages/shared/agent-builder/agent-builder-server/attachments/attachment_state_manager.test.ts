/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import { hashContent } from '@kbn/agent-builder-common/attachments';
import {
  createAttachmentStateManager,
  type AttachmentStateManager,
} from './attachment_state_manager';

describe('AttachmentStateManager', () => {
  let manager: AttachmentStateManager;

  beforeEach(() => {
    manager = createAttachmentStateManager();
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
    it('creates a new attachment with version 1', () => {
      const attachment = manager.add({
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

    it('uses explicit ID when provided', () => {
      const attachment = manager.add({
        id: 'custom-id-123',
        type: 'text',
        data: { content: 'Test' },
      });

      expect(attachment.id).toBe('custom-id-123');
    });

    it('generates UUID when ID not provided', () => {
      const attachment = manager.add({
        type: 'text',
        data: { content: 'Test' },
      });

      // UUID format check
      expect(attachment.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('computes content hash', () => {
      const data = { content: 'Test content' };
      const attachment = manager.add({
        type: 'text',
        data,
      });

      expect(attachment.versions[0].content_hash).toBe(hashContent(data));
    });

    it('estimates tokens', () => {
      const attachment = manager.add({
        type: 'text',
        data: { content: 'a'.repeat(100) }, // ~100 chars
      });

      expect(attachment.versions[0].estimated_tokens).toBeGreaterThan(0);
    });

    it('sets hidden flag when provided', () => {
      const attachment = manager.add({
        type: 'screen_context',
        data: { url: 'http://example.com' },
        hidden: true,
      });

      expect(attachment.hidden).toBe(true);
    });

    it('marks state as dirty', () => {
      expect(manager.hasChanges()).toBe(false);

      manager.add({ type: 'text', data: { content: 'Test' } });

      expect(manager.hasChanges()).toBe(true);
    });
  });

  describe('get()', () => {
    it('returns the attachment by ID', () => {
      const added = manager.add({ id: 'test-1', type: 'text', data: { content: 'Test' } });

      const retrieved = manager.get('test-1');

      expect(retrieved).toEqual(added);
    });

    it('returns undefined for non-existent ID', () => {
      const result = manager.get('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getLatest()', () => {
    it('returns the current version', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'v1' } });
      manager.update('test-1', { data: { content: 'v2' } });

      const latest = manager.getLatest('test-1');

      expect(latest?.version).toBe(2);
      expect(latest?.data).toEqual({ content: 'v2' });
    });

    it('returns undefined for non-existent attachment', () => {
      expect(manager.getLatest('non-existent')).toBeUndefined();
    });
  });

  describe('getVersion()', () => {
    it('retrieves specific version by number', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'v1' } });
      manager.update('test-1', { data: { content: 'v2' } });
      manager.update('test-1', { data: { content: 'v3' } });

      const v2 = manager.getVersion('test-1', 2);

      expect(v2?.version).toBe(2);
      expect(v2?.data).toEqual({ content: 'v2' });
    });

    it('returns undefined for non-existent version', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'v1' } });

      expect(manager.getVersion('test-1', 99)).toBeUndefined();
    });
  });

  describe('getActive()', () => {
    it('filters out deleted attachments', () => {
      manager.add({ id: 'active-1', type: 'text', data: { content: 'Active 1' } });
      manager.add({ id: 'active-2', type: 'text', data: { content: 'Active 2' } });
      manager.add({ id: 'deleted-1', type: 'text', data: { content: 'Deleted' } });

      manager.delete('deleted-1');

      const active = manager.getActive();

      expect(active).toHaveLength(2);
      expect(active.map((a) => a.id)).toEqual(['active-1', 'active-2']);
    });

    it('returns empty array when all deleted', () => {
      manager.add({ id: 'att-1', type: 'text', data: { content: 'Test' } });
      manager.delete('att-1');

      expect(manager.getActive()).toHaveLength(0);
    });
  });

  describe('getAll()', () => {
    it('returns all attachments including deleted', () => {
      manager.add({ id: 'active-1', type: 'text', data: { content: 'Active' } });
      manager.add({ id: 'deleted-1', type: 'text', data: { content: 'Deleted' } });
      manager.delete('deleted-1');

      const all = manager.getAll();

      expect(all).toHaveLength(2);
      expect(all.map((a) => a.id).sort()).toEqual(['active-1', 'deleted-1']);
    });
  });

  describe('update()', () => {
    it('creates new version when content changes', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'v1' } });

      const updated = manager.update('test-1', { data: { content: 'v2' } });

      expect(updated?.current_version).toBe(2);
      expect(updated?.versions).toHaveLength(2);
      expect(updated?.versions[1].data).toEqual({ content: 'v2' });
    });

    it('does NOT create new version when content is identical', () => {
      const data = { content: 'same content' };
      manager.add({ id: 'test-1', type: 'text', data });

      const updated = manager.update('test-1', { data });

      expect(updated?.current_version).toBe(1);
      expect(updated?.versions).toHaveLength(1);
    });

    it('updates description without creating new version', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });

      const updated = manager.update('test-1', { description: 'New description' });

      expect(updated?.description).toBe('New description');
      expect(updated?.current_version).toBe(1);
      expect(updated?.versions).toHaveLength(1);
    });

    it('updates hidden without creating new version', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'test' }, hidden: false });

      const updated = manager.update('test-1', { hidden: true });

      expect(updated?.hidden).toBe(true);
      expect(updated?.current_version).toBe(1);
    });

    it('returns undefined for non-existent attachment', () => {
      expect(manager.update('non-existent', { data: {} })).toBeUndefined();
    });

    it('marks state as dirty', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'v1' } });
      manager.markClean();

      manager.update('test-1', { data: { content: 'v2' } });

      expect(manager.hasChanges()).toBe(true);
    });
  });

  describe('delete()', () => {
    it('sets active to false', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });

      const result = manager.delete('test-1');
      const attachment = manager.get('test-1');

      expect(result).toBe(true);
      expect(attachment?.active).toBe(false);
    });

    it('returns false for already deleted attachment', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });
      manager.delete('test-1');

      const result = manager.delete('test-1');

      expect(result).toBe(false);
    });

    it('returns false for non-existent attachment', () => {
      expect(manager.delete('non-existent')).toBe(false);
    });

    it('marks state as dirty', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });
      manager.markClean();

      manager.delete('test-1');

      expect(manager.hasChanges()).toBe(true);
    });
  });

  describe('restore()', () => {
    it('sets active back to true', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });
      manager.delete('test-1');

      const result = manager.restore('test-1');
      const attachment = manager.get('test-1');

      expect(result).toBe(true);
      expect(attachment?.active).toBe(true);
    });

    it('returns false for already active attachment', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });

      const result = manager.restore('test-1');

      expect(result).toBe(false);
    });

    it('returns false for non-existent attachment', () => {
      expect(manager.restore('non-existent')).toBe(false);
    });

    it('marks state as dirty', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });
      manager.delete('test-1');
      manager.markClean();

      manager.restore('test-1');

      expect(manager.hasChanges()).toBe(true);
    });
  });

  describe('permanentDelete()', () => {
    it('removes attachment completely', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });

      const result = manager.permanentDelete('test-1');

      expect(result).toBe(true);
      expect(manager.get('test-1')).toBeUndefined();
      expect(manager.getAll()).toHaveLength(0);
    });

    it('returns false for non-existent attachment', () => {
      expect(manager.permanentDelete('non-existent')).toBe(false);
    });

    it('marks state as dirty', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });
      manager.markClean();

      manager.permanentDelete('test-1');

      expect(manager.hasChanges()).toBe(true);
    });
  });

  describe('rename()', () => {
    it('updates description without creating new version', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });

      const result = manager.rename('test-1', 'New Name');
      const attachment = manager.get('test-1');

      expect(result).toBe(true);
      expect(attachment?.description).toBe('New Name');
      expect(attachment?.current_version).toBe(1);
    });

    it('returns false for non-existent attachment', () => {
      expect(manager.rename('non-existent', 'Name')).toBe(false);
    });

    it('marks state as dirty', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'test' } });
      manager.markClean();

      manager.rename('test-1', 'New Name');

      expect(manager.hasChanges()).toBe(true);
    });
  });

  describe('getDiff()', () => {
    it('returns update diff when content changes', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'v1' }, description: 'Test' });
      manager.update('test-1', { data: { content: 'v2' } });

      const diff = manager.getDiff('test-1', 1, 2);

      expect(diff?.change_type).toBe('update');
      expect(diff?.summary).toContain('Updated');
      expect(diff?.changed_fields).toContain('data');
    });

    it('returns undefined for non-existent attachment', () => {
      expect(manager.getDiff('non-existent', 1, 2)).toBeUndefined();
    });

    it('returns undefined for non-existent versions', () => {
      manager.add({ id: 'test-1', type: 'text', data: { content: 'v1' } });

      expect(manager.getDiff('test-1', 1, 99)).toBeUndefined();
    });
  });

  describe('resolveRefs()', () => {
    it('returns correct attachment versions', () => {
      manager.add({ id: 'att-1', type: 'text', data: { content: 'v1' } });
      manager.update('att-1', { data: { content: 'v2' } });
      manager.add({ id: 'att-2', type: 'esql', data: { query: 'SELECT *' } });

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

    it('skips non-existent attachments', () => {
      manager.add({ id: 'att-1', type: 'text', data: { content: 'test' } });

      const refs: AttachmentVersionRef[] = [
        { attachment_id: 'att-1', version: 1 },
        { attachment_id: 'non-existent', version: 1 },
      ];

      const resolved = manager.resolveRefs(refs);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].id).toBe('att-1');
    });

    it('skips non-existent versions', () => {
      manager.add({ id: 'att-1', type: 'text', data: { content: 'test' } });

      const refs: AttachmentVersionRef[] = [{ attachment_id: 'att-1', version: 99 }];

      const resolved = manager.resolveRefs(refs);

      expect(resolved).toHaveLength(0);
    });

    it('includes active status in resolved refs', () => {
      manager.add({ id: 'att-1', type: 'text', data: { content: 'test' } });
      manager.delete('att-1');

      const refs: AttachmentVersionRef[] = [{ attachment_id: 'att-1', version: 1 }];

      const resolved = manager.resolveRefs(refs);

      expect(resolved[0].active).toBe(false);
    });
  });

  describe('getTotalTokenEstimate()', () => {
    it('sums tokens from all active attachments', () => {
      // Each attachment will have different estimated tokens based on content size
      manager.add({ id: 'att-1', type: 'text', data: { content: 'short' } });
      manager.add({ id: 'att-2', type: 'text', data: { content: 'a'.repeat(100) } });

      const total = manager.getTotalTokenEstimate();

      expect(total).toBeGreaterThan(0);
    });

    it('excludes deleted attachments', () => {
      manager.add({ id: 'att-1', type: 'text', data: { content: 'a'.repeat(100) } });
      manager.add({ id: 'att-2', type: 'text', data: { content: 'b'.repeat(100) } });

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

    it('returns true after add', () => {
      manager.add({ type: 'text', data: {} });
      expect(manager.hasChanges()).toBe(true);
    });

    it('returns true after update', () => {
      manager.add({ id: 'test', type: 'text', data: { content: 'v1' } });
      manager.markClean();

      manager.update('test', { data: { content: 'v2' } });

      expect(manager.hasChanges()).toBe(true);
    });

    it('returns true after delete', () => {
      manager.add({ id: 'test', type: 'text', data: {} });
      manager.markClean();

      manager.delete('test');

      expect(manager.hasChanges()).toBe(true);
    });
  });

  describe('markClean()', () => {
    it('resets the dirty flag', () => {
      manager.add({ type: 'text', data: {} });
      expect(manager.hasChanges()).toBe(true);

      manager.markClean();

      expect(manager.hasChanges()).toBe(false);
    });
  });

  describe('initialization with existing attachments', () => {
    it('preserves initial attachments', () => {
      const initial: VersionedAttachment[] = [
        createTestAttachment({ id: 'existing-1' }),
        createTestAttachment({ id: 'existing-2' }),
      ];

      const mgr = createAttachmentStateManager(initial);

      expect(mgr.getAll()).toHaveLength(2);
      expect(mgr.get('existing-1')).toBeDefined();
      expect(mgr.get('existing-2')).toBeDefined();
    });

    it('deep clones initial attachments to avoid mutation', () => {
      const initial: VersionedAttachment[] = [createTestAttachment({ id: 'test-1' })];

      const mgr = createAttachmentStateManager(initial);

      // Mutate original
      initial[0].description = 'mutated';

      // Manager should not be affected
      expect(mgr.get('test-1')?.description).toBeUndefined();
    });

    it('starts clean (no changes) when initialized', () => {
      const initial: VersionedAttachment[] = [createTestAttachment()];

      const mgr = createAttachmentStateManager(initial);

      expect(mgr.hasChanges()).toBe(false);
    });
  });
});
