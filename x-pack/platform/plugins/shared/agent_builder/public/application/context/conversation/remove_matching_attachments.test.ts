/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { removeMatchingAttachments } from './remove_matching_attachments';

const attachment = (id?: string): AttachmentInput => ({ id, type: 'text', data: {} });

describe('removeMatchingAttachments', () => {
  it('removes items by id, even when the object is a new copy', () => {
    const list = [attachment('a'), attachment('b'), attachment('c')];
    expect(removeMatchingAttachments(list, [attachment('a'), attachment('c')])).toEqual([
      attachment('b'),
    ]);
  });

  it('removes items without an id by object reference only', () => {
    const first = attachment();
    const second = attachment();
    expect(removeMatchingAttachments([first, second], [second])).toEqual([first]);
    expect(removeMatchingAttachments([first, second], [attachment()])).toHaveLength(2);
  });

  it('keeps items that were not given', () => {
    const list = [attachment('a'), attachment()];
    expect(removeMatchingAttachments(list, [])).toEqual(list);
  });
});
