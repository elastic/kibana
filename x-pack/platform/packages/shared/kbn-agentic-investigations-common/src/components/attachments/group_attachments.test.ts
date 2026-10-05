/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { groupAttachments } from './group_attachments';
import type { KnownAttachmentGroup } from './attachment_groups';

const KNOWN_GROUPS: readonly KnownAttachmentGroup[] = [
  { id: 'alert', types: ['security.alert', 'security.alerts'], title: 'Alerts' },
  { id: 'rule', types: ['security.rule'], title: 'Rules' },
];

const makeAttachment = (
  id: string,
  type: string,
  createdAt = '2024-01-01T00:00:00.000Z'
): VersionedAttachment => ({
  id,
  type,
  hidden: false,
  origin: null,
  origin_snapshot_at: null,
  group_id: null,
  description: null,
  versions: [{ version: 1, created_at: createdAt, data: {} }],
  current_version: 1,
});

describe('groupAttachments', () => {
  it('returns an empty array when there are no attachments', () => {
    expect(groupAttachments(undefined, KNOWN_GROUPS)).toEqual([]);
    expect(groupAttachments([], KNOWN_GROUPS)).toEqual([]);
  });

  it('skips hidden attachments', () => {
    const hidden: VersionedAttachment = { ...makeAttachment('h1', 'security.alert'), hidden: true };
    expect(groupAttachments([hidden], KNOWN_GROUPS)).toEqual([]);
  });

  it('skips deleted (no versions) attachments', () => {
    const deleted: VersionedAttachment = {
      ...makeAttachment('d1', 'security.alert'),
      versions: [],
      current_version: null,
    };
    expect(groupAttachments([deleted], KNOWN_GROUPS)).toEqual([]);
  });

  it('groups attachments by known group', () => {
    const a1 = makeAttachment('a1', 'security.alert');
    const r1 = makeAttachment('r1', 'security.rule');
    const groups = groupAttachments([a1, r1], KNOWN_GROUPS);
    expect(groups).toHaveLength(2);
    expect(groups[0].id).toBe('alert');
    expect(groups[0].attachments).toHaveLength(1);
    expect(groups[0].attachments[0].id).toBe('a1');
    expect(groups[1].id).toBe('rule');
  });

  it('merges both security.alert and security.alerts into the alert group', () => {
    const a1 = makeAttachment('a1', 'security.alert');
    const a2 = makeAttachment('a2', 'security.alerts');
    const groups = groupAttachments([a1, a2], KNOWN_GROUPS);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('alert');
    expect(groups[0].attachments).toHaveLength(2);
  });

  it('creates ad-hoc groups for unknown types', () => {
    const u1 = makeAttachment('u1', 'custom.type');
    const groups = groupAttachments([u1], KNOWN_GROUPS);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('custom.type');
    expect(groups[0].title).toBeUndefined();
  });

  it('puts known groups before ad-hoc groups', () => {
    const u1 = makeAttachment('u1', 'custom.type', '2023-01-01T00:00:00.000Z');
    const a1 = makeAttachment('a1', 'security.alert', '2024-01-01T00:00:00.000Z');
    const groups = groupAttachments([u1, a1], KNOWN_GROUPS);
    expect(groups[0].id).toBe('alert');
    expect(groups[1].id).toBe('custom.type');
  });

  it('preserves known group order regardless of attachment order', () => {
    const r1 = makeAttachment('r1', 'security.rule', '2023-01-01T00:00:00.000Z');
    const a1 = makeAttachment('a1', 'security.alert', '2024-01-01T00:00:00.000Z');
    const groups = groupAttachments([r1, a1], KNOWN_GROUPS);
    expect(groups[0].id).toBe('alert');
    expect(groups[1].id).toBe('rule');
  });

  it('sorts attachments within a group by first-version time, then id', () => {
    const a1 = makeAttachment('a1', 'security.alert', '2024-01-02T00:00:00.000Z');
    const a2 = makeAttachment('a2', 'security.alert', '2024-01-01T00:00:00.000Z');
    const a3 = makeAttachment('a3', 'security.alert', '2024-01-01T00:00:00.000Z');
    const groups = groupAttachments([a1, a2, a3], KNOWN_GROUPS);
    const ids = groups[0].attachments.map((a) => a.id);
    // a2 and a3 share the same time; a3 sorts after a2 by id lexicographic order
    expect(ids).toEqual(['a2', 'a3', 'a1']);
  });

  it('sorts all groups alphabetically by title then id', () => {
    const u1 = makeAttachment('u1', 'zzz.type', '2024-01-01T00:00:00.000Z');
    const u2 = makeAttachment('u2', 'aaa.type', '2024-01-02T00:00:00.000Z');
    const groups = groupAttachments([u1, u2], KNOWN_GROUPS);
    expect(groups[0].id).toBe('aaa.type');
    expect(groups[1].id).toBe('zzz.type');
  });

  it('uses group title for known groups and leaves title undefined for ad-hoc groups', () => {
    const a1 = makeAttachment('a1', 'security.alert');
    const u1 = makeAttachment('u1', 'custom.type');
    const groups = groupAttachments([a1, u1], KNOWN_GROUPS);
    expect(groups[0].title).toBe('Alerts');
    expect(groups[1].title).toBeUndefined();
  });
});
