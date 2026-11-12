/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hashContent, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { findStoredTextFileId } from './find_stored_text_file';

const storedAttachment = (id: string, type: string, data: unknown): VersionedAttachment =>
  ({
    id,
    type,
    current_version: 1,
    versions: [{ version: 1, data, content_hash: hashContent(data) }],
  } as VersionedAttachment);

const notes = { content: '# Hi', name: 'notes.md' };

describe('findStoredTextFileId', () => {
  it('finds the stored text file with the same name and content', () => {
    const stored = [
      storedAttachment('other', 'text', { content: '# Other', name: 'other.md' }),
      storedAttachment('notes', 'text', notes),
    ];

    expect(findStoredTextFileId(notes, stored)).toBe('notes');
  });

  it.each([
    ['the content changed', storedAttachment('notes', 'text', { ...notes, content: '# Bye' })],
    ['the name changed', storedAttachment('notes', 'text', { ...notes, name: 'notes 2.md' })],
    ['the type is not text', storedAttachment('notes', 'esql', notes)],
  ])('finds nothing when %s', (_, stored) => {
    expect(findStoredTextFileId(notes, [stored])).toBeUndefined();
  });

  it('finds nothing when the conversation has no attachments', () => {
    expect(findStoredTextFileId(notes, undefined)).toBeUndefined();
  });
});
