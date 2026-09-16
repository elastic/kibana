/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { diffAttachments } from './attachment_diff';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';

const makeAttachment = (
  id: string,
  overrides: Partial<VersionedAttachment> = {}
): VersionedAttachment => ({
  id,
  type: 'text',
  versions: [],
  current_version: 1,
  active: true,
  ...overrides,
});

describe('diffAttachments', () => {
  it('emits added when an attachment is new', () => {
    const after = makeAttachment('a1');
    expect(diffAttachments({ before: [], after: [after] })).toEqual([
      { kind: 'added', attachmentId: 'a1', attachmentType: 'text' },
    ]);
  });

  it('emits nothing when before and after are identical', () => {
    const a = makeAttachment('a1');
    expect(diffAttachments({ before: [a], after: [a] })).toEqual([]);
  });

  it('emits deleted when an active attachment is permanently removed (absent from after)', () => {
    const a = makeAttachment('a1');
    expect(diffAttachments({ before: [a], after: [] })).toEqual([
      { kind: 'deleted', attachmentId: 'a1', attachmentType: 'text' },
    ]);
  });

  it('emits deleted when an active attachment is soft-deleted (active: false)', () => {
    const before = makeAttachment('a1', { active: true });
    const after = makeAttachment('a1', { active: false });
    expect(diffAttachments({ before: [before], after: [after] })).toEqual([
      { kind: 'deleted', attachmentId: 'a1', attachmentType: 'text' },
    ]);
  });

  it('emits updated when a soft-deleted attachment is restored (active: false → true)', () => {
    const before = makeAttachment('a1', { active: false });
    const after = makeAttachment('a1', { active: true });
    expect(diffAttachments({ before: [before], after: [after] })).toEqual([
      { kind: 'updated', attachmentId: 'a1', attachmentType: 'text' },
    ]);
  });

  it('emits updated when attachment content changes', () => {
    const before = makeAttachment('a1', { description: 'old' });
    const after = makeAttachment('a1', { description: 'new' });
    expect(diffAttachments({ before: [before], after: [after] })).toEqual([
      { kind: 'updated', attachmentId: 'a1', attachmentType: 'text' },
    ]);
  });

  it('handles a batch with multiple attachment changes', () => {
    const unchanged = makeAttachment('unchanged');
    const added = makeAttachment('added');
    const deleted = makeAttachment('deleted');
    const updated = makeAttachment('updated', { description: 'old' });
    const updatedAfter = makeAttachment('updated', { description: 'new' });

    const changes = diffAttachments({
      before: [unchanged, deleted, updated],
      after: [unchanged, added, updatedAfter],
    });

    expect(changes).toHaveLength(3);
    expect(changes).toContainEqual({
      kind: 'added',
      attachmentId: 'added',
      attachmentType: 'text',
    });
    expect(changes).toContainEqual({
      kind: 'deleted',
      attachmentId: 'deleted',
      attachmentType: 'text',
    });
    expect(changes).toContainEqual({
      kind: 'updated',
      attachmentId: 'updated',
      attachmentType: 'text',
    });
  });

  it('emits nothing when both before and after are empty', () => {
    expect(diffAttachments({ before: [], after: [] })).toEqual([]);
  });
});
