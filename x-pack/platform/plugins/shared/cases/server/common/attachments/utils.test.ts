/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeReferenceAttachmentId, toReferenceMetadata } from './utils';

describe('attachments utils', () => {
  describe('toReferenceMetadata', () => {
    it('preserves a single-item array so the index round-trips to the same shape', () => {
      expect(toReferenceMetadata(['logs-1'])).toEqual({ index: ['logs-1'] });
    });

    it('preserves a scalar index', () => {
      expect(toReferenceMetadata('logs-1')).toEqual({ index: 'logs-1' });
    });

    it('returns undefined when index is empty', () => {
      expect(toReferenceMetadata('')).toBeUndefined();
    });
  });

  describe('normalizeReferenceAttachmentId', () => {
    it('preserves a single-item array so the id round-trips to the same shape', () => {
      expect(normalizeReferenceAttachmentId(['event-1'])).toEqual(['event-1']);
    });

    it('preserves a scalar id', () => {
      expect(normalizeReferenceAttachmentId('event-1')).toBe('event-1');
    });

    it('preserves multiple ids as an array', () => {
      expect(normalizeReferenceAttachmentId(['event-1', 'event-2'])).toEqual([
        'event-1',
        'event-2',
      ]);
    });
  });
});
