/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { upsertAttachmentsIntoList } from './upsert_attachments_into_list';

const attachment = (
  id: string | undefined,
  overrides: Partial<AttachmentInput> = {}
): AttachmentInput => ({
  id,
  type: 'visualization',
  data: {},
  ...overrides,
});

describe('upsertAttachmentsIntoList', () => {
  it('returns next only when existing is undefined or empty', () => {
    expect(upsertAttachmentsIntoList(undefined, [attachment('a')])).toEqual([attachment('a')]);
    expect(upsertAttachmentsIntoList([], [attachment('a')])).toEqual([attachment('a')]);
  });

  it('returns existing when next is empty', () => {
    const existing = [attachment('a'), attachment('b')];
    expect(upsertAttachmentsIntoList(existing, [])).toEqual(existing);
    expect(upsertAttachmentsIntoList(existing, [])).not.toBe(existing);
  });

  it('updates existing items in place when next contains same id', () => {
    const existing = [attachment('a', { type: 'text' }), attachment('b', { data: { old: true } })];
    const next = [
      attachment('a', { type: 'visualization' }),
      attachment('b', { data: { updated: true } }),
    ];
    const result = upsertAttachmentsIntoList(existing, next);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(next[0]);
    expect(result[1]).toEqual(next[1]);
    expect(result[0].type).toBe('visualization');
    expect((result[1].data as { updated?: boolean }).updated).toBe(true);
  });

  it('preserves order: existing slots updated, then new items appended', () => {
    const existing = [attachment('first'), attachment('second')];
    const next = [attachment('new'), attachment('second', { data: { v: 2 } })];
    const result = upsertAttachmentsIntoList(existing, next);
    expect(result.map((a) => a.id)).toEqual(['first', 'second', 'new']);
    expect((result[1].data as { v?: number }).v).toBe(2);
  });

  it('appends items without id and items whose id is not in existing', () => {
    const existing = [attachment('x')];
    const next = [
      attachment(undefined),
      attachment('y'),
      attachment('x', { data: { updated: true } }),
    ];
    const result = upsertAttachmentsIntoList(existing, next);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(attachment('x', { data: { updated: true } }));
    expect(result[1]).toEqual(attachment(undefined));
    expect(result[2]).toEqual(attachment('y'));
  });

  it('does not mutate existing or next arrays', () => {
    const existing = [attachment('a')];
    const next = [attachment('a', { type: 'text' })];
    const existingSnapshot = JSON.stringify(existing);
    const nextSnapshot = JSON.stringify(next);
    upsertAttachmentsIntoList(existing, next);
    expect(JSON.stringify(existing)).toBe(existingSnapshot);
    expect(JSON.stringify(next)).toBe(nextSnapshot);
  });
});
