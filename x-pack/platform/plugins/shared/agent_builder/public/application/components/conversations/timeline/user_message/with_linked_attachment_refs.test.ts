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
import { getLinkedAttachmentIds, withLinkedAttachmentRefs } from './with_linked_attachment_refs';

const pdf = (id: string, currentVersion = 1) =>
  ({
    id,
    type: 'binary',
    current_version: currentVersion,
    versions: [],
  } as unknown as VersionedAttachment);

const imageRef: AttachmentVersionRef = {
  attachment_id: 'img-1',
  version: 1,
  operation: 'created',
  actor: 'user',
};

describe('getLinkedAttachmentIds', () => {
  it('returns the ids of PDF and text file links in text order', () => {
    expect(
      getLinkedAttachmentIds(
        '[a.pdf](binary://a.pdf?id=att%201) hi [b.md](text://b.md?id=att-2) [c.pdf](binary://c.pdf?id=att-3)'
      )
    ).toEqual(['att 1', 'att-2', 'att-3']);
  });

  it('ignores chip links without an id and links of other schemes', () => {
    expect(
      getLinkedAttachmentIds('[a.pdf](binary://a.pdf) [b.md](text://b.md) [s](skill://s?id=y)')
    ).toEqual([]);
  });
});

describe('withLinkedAttachmentRefs', () => {
  it('returns the event refs unchanged when the text links to nothing', () => {
    const attachmentRefs = [imageRef];

    expect(
      withLinkedAttachmentRefs({ text: 'hi', attachmentRefs, conversationAttachments: [] })
    ).toBe(attachmentRefs);
  });

  it('adds a user ref at the current version for a linked attachment, after the event refs', () => {
    expect(
      withLinkedAttachmentRefs({
        text: '[a.pdf](binary://a.pdf?id=att-1) hi',
        attachmentRefs: [imageRef],
        conversationAttachments: [pdf('att-1', 2)],
      })
    ).toEqual([
      imageRef,
      { attachment_id: 'att-1', version: 2, operation: 'created', actor: 'user' },
    ]);
  });

  it('skips a linked attachment that already has a ref or is not in the conversation', () => {
    expect(
      withLinkedAttachmentRefs({
        text: '[a.pdf](binary://a.pdf?id=img-1) [b.pdf](binary://b.pdf?id=gone)',
        attachmentRefs: [imageRef],
        conversationAttachments: [pdf('img-1')],
      })
    ).toEqual([imageRef]);
  });
});
