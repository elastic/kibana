/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentGroup,
  AttachmentInput,
  ConversationAttachment,
} from '@kbn/agent-builder-common/attachments';
import { flattenAttachments } from './flatten_attachments';

const input = (type = 'text', id?: string): AttachmentInput => ({ type, id, data: {} });

const group = (id: string, items: AttachmentInput[]): AttachmentGroup => ({
  type: 'group',
  id,
  label: `${items.length} Alerts`,
  items,
});

describe('flattenAttachments', () => {
  it('returns empty array for empty input', () => {
    expect(flattenAttachments([])).toEqual([]);
  });

  it('passes individual AttachmentInput through unchanged', () => {
    const a = input('text', 'a');
    const b = input('visualization', 'b');
    expect(flattenAttachments([a, b])).toEqual([a, b]);
  });

  it('expands a group to its constituent items', () => {
    const item1 = input('security.alerts', 'i1');
    const item2 = input('security.alerts', 'i2');
    const g = group('g1', [item1, item2]);
    expect(flattenAttachments([g])).toEqual([item1, item2]);
  });

  it('flattens a mixed list — groups expand in place, individuals pass through', () => {
    const solo = input('text', 's1');
    const item1 = input('security.alerts', 'a1');
    const item2 = input('security.alerts', 'a2');
    const g = group('g1', [item1, item2]);
    const result = flattenAttachments([solo, g]);
    expect(result).toEqual([solo, item1, item2]);
  });

  it('preserves order across multiple groups and individuals', () => {
    const a = input('text', 'a');
    const g1Items = [input('security.alerts', 'g1i1'), input('security.alerts', 'g1i2')];
    const g2Items = [input('security.alerts', 'g2i1')];
    const b = input('visualization', 'b');
    const attachments: ConversationAttachment[] = [
      a,
      group('g1', g1Items),
      b,
      group('g2', g2Items),
    ];
    expect(flattenAttachments(attachments)).toEqual([a, ...g1Items, b, ...g2Items]);
  });

  it('handles a group with no items', () => {
    const g = group('empty', []);
    expect(flattenAttachments([g])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const items: ConversationAttachment[] = [input('text', 'x')];
    const snapshot = JSON.stringify(items);
    flattenAttachments(items);
    expect(JSON.stringify(items)).toBe(snapshot);
  });
});
