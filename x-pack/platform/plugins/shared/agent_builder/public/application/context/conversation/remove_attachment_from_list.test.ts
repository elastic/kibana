/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { removeAttachmentFromList } from './remove_attachment_from_list';

const attachment = (
  id: string | undefined,
  overrides: Partial<AttachmentInput> = {}
): AttachmentInput => ({
  id,
  type: 'visualization',
  data: {},
  ...overrides,
});

describe('removeAttachmentFromList', () => {
  it('removes the item at the given index when there is no groupId', () => {
    const list = [attachment('a'), attachment('b'), attachment('c')];
    expect(removeAttachmentFromList(list, 1)).toEqual([attachment('a'), attachment('c')]);
  });

  it('removes all items sharing the same groupId when the target has one', () => {
    const list = [
      attachment('a', { groupId: 'g1' }),
      attachment('b', { groupId: 'g1' }),
      attachment('c'),
    ];
    expect(removeAttachmentFromList(list, 0)).toEqual([attachment('c')]);
  });

  it('removes all groupId siblings regardless of which sibling index is targeted', () => {
    const list = [
      attachment('a'),
      attachment('b', { groupId: 'g2' }),
      attachment('c', { groupId: 'g2' }),
      attachment('d', { groupId: 'g2' }),
    ];
    expect(removeAttachmentFromList(list, 2)).toEqual([attachment('a')]);
  });

  it('removes only the first item when targeted by index with no groupId', () => {
    const list = [attachment('a'), attachment('b'), attachment('c')];
    expect(removeAttachmentFromList(list, 0)).toEqual([attachment('b'), attachment('c')]);
  });

  it('removes only the last item when targeted by index with no groupId', () => {
    const list = [attachment('a'), attachment('b'), attachment('c')];
    expect(removeAttachmentFromList(list, 2)).toEqual([attachment('a'), attachment('b')]);
  });

  it('returns all items unchanged when index is out of bounds', () => {
    const list = [attachment('a'), attachment('b')];
    expect(removeAttachmentFromList(list, 99)).toEqual(list);
  });

  it('does not mutate the input array', () => {
    const list = [attachment('a', { groupId: 'g' }), attachment('b', { groupId: 'g' })];
    const snapshot = JSON.stringify(list);
    removeAttachmentFromList(list, 0);
    expect(JSON.stringify(list)).toBe(snapshot);
  });
});
