/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { corpusEntrySmlType, CORPUS_ENTRY_SML_TYPE } from './corpus_entry';

const baseItem = {
  id: 'item-1',
  type: CORPUS_ENTRY_SML_TYPE,
  origin_id: 'origin-1',
  ingestion_method: 'manual' as const,
  spaces: ['default'],
};

describe('corpusEntrySmlType', () => {
  describe('id', () => {
    it('is corpus_entry', () => {
      expect(corpusEntrySmlType.id).toBe('corpus_entry');
    });
  });

  describe('list', () => {
    it('yields nothing', async () => {
      const items: unknown[] = [];
      for await (const item of corpusEntrySmlType.list({} as any)) {
        items.push(item);
      }
      expect(items).toHaveLength(0);
    });
  });

  describe('getSmlData', () => {
    it('returns undefined', async () => {
      await expect(corpusEntrySmlType.getSmlData({} as any)).resolves.toBeUndefined();
    });
  });

  describe('toAttachment', () => {
    it('returns undefined when all text fields are empty', async () => {
      const result = await corpusEntrySmlType.toAttachment!({
        ...baseItem,
        title: '',
        content: '',
        description: '',
      });
      expect(result).toBeUndefined();
    });

    it('returns undefined when content is whitespace only and no title or description', async () => {
      const result = await corpusEntrySmlType.toAttachment!({
        ...baseItem,
        content: '   ',
      });
      expect(result).toBeUndefined();
    });

    it('builds attachment from content alone', async () => {
      const result = await corpusEntrySmlType.toAttachment!({
        ...baseItem,
        content: 'body text',
      });
      expect(result).toEqual({
        id: 'item-1',
        type: AttachmentType.text,
        data: { content: 'body text' },
        readonly: true,
      });
    });

    it('folds title and content with double newline separator', async () => {
      const result = await corpusEntrySmlType.toAttachment!({
        ...baseItem,
        title: 'My Title',
        content: 'body text',
      });
      expect(result).toEqual({
        id: 'item-1',
        type: AttachmentType.text,
        data: { content: '# My Title\n\nbody text' },
        readonly: true,
      });
    });

    it('includes description in content and sets description field', async () => {
      const result = await corpusEntrySmlType.toAttachment!({
        ...baseItem,
        title: 'My Title',
        description: 'A summary',
        content: 'body text',
      });
      expect(result).toEqual({
        id: 'item-1',
        type: AttachmentType.text,
        data: { content: '# My Title\n\nA summary\n\nbody text' },
        description: 'A summary',
        readonly: true,
      });
    });

    it('does not set description field when description is absent', async () => {
      const result = await corpusEntrySmlType.toAttachment!({
        ...baseItem,
        title: 'My Title',
        content: 'body text',
      });
      expect(result).not.toHaveProperty('description');
    });
  });
});
