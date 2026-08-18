/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput, AttachmentGroup } from '@kbn/agent-builder-common/attachments';
import { removeAttachmentFromList } from './remove_attachment_from_list';

const attachment = (id: string | undefined): AttachmentInput => ({
  id,
  type: 'visualization',
  data: {},
});

const group = (id: string): AttachmentGroup => ({
  type: 'group',
  id,
  label: '3 Alerts',
  items: [attachment('a'), attachment('b'), attachment('c')],
});

describe('removeAttachmentFromList', () => {
  it('removes the item at the given index', () => {
    const list = [attachment('a'), attachment('b'), attachment('c')];
    expect(removeAttachmentFromList(list, 1)).toEqual([attachment('a'), attachment('c')]);
  });

  it('removes an AttachmentGroup at the given index (entire group removed)', () => {
    const g = group('g1');
    const list = [attachment('a'), g, attachment('c')];
    expect(removeAttachmentFromList(list, 1)).toEqual([attachment('a'), attachment('c')]);
  });

  it('removes the first item', () => {
    const list = [attachment('a'), attachment('b'), attachment('c')];
    expect(removeAttachmentFromList(list, 0)).toEqual([attachment('b'), attachment('c')]);
  });

  it('removes the last item', () => {
    const list = [attachment('a'), attachment('b'), attachment('c')];
    expect(removeAttachmentFromList(list, 2)).toEqual([attachment('a'), attachment('b')]);
  });

  it('returns all items unchanged when index is out of bounds', () => {
    const list = [attachment('a'), attachment('b')];
    expect(removeAttachmentFromList(list, 99)).toEqual(list);
  });

  it('does not mutate the input array', () => {
    const list = [attachment('a'), attachment('b')];
    const snapshot = JSON.stringify(list);
    removeAttachmentFromList(list, 0);
    expect(JSON.stringify(list)).toBe(snapshot);
  });
});
