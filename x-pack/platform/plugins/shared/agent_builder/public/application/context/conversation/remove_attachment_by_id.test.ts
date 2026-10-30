/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput, AttachmentGroup } from '@kbn/agent-builder-common/attachments';
import { removeAttachmentById } from './remove_attachment_by_id';

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

describe('removeAttachmentById', () => {
  it('removes the item with the matching id', () => {
    const list = [attachment('a'), attachment('b'), attachment('c')];
    expect(removeAttachmentById(list, 'b')).toEqual([attachment('a'), attachment('c')]);
  });

  it('removes an AttachmentGroup with the matching id', () => {
    const g = group('g1');
    const list = [attachment('a'), g, attachment('c')];
    expect(removeAttachmentById(list, 'g1')).toEqual([attachment('a'), attachment('c')]);
  });

  it('returns all items unchanged when id is not found', () => {
    const list = [attachment('a'), attachment('b')];
    expect(removeAttachmentById(list, 'z')).toEqual(list);
  });

  it('does not remove items without an id', () => {
    const list = [attachment(undefined), attachment('a')];
    expect(removeAttachmentById(list, 'a')).toEqual([attachment(undefined)]);
  });

  it('does not mutate the input array', () => {
    const list = [attachment('a'), attachment('b')];
    const snapshot = JSON.stringify(list);
    removeAttachmentById(list, 'a');
    expect(JSON.stringify(list)).toBe(snapshot);
  });
});
