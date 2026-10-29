/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { dateType } from './common';
import { optionalSettingsSchema, settingsSchema } from './slo';

describe('Schema', () => {
  describe('DateType', () => {
    it('encodes', () => {
      expect(z.encode(dateType, new Date('2022-06-01T08:00:00.000Z'))).toEqual(
        '2022-06-01T08:00:00.000Z'
      );
    });

    it('decodes', () => {
      const result = dateType.safeParse('2022-06-01T08:00:00.000Z');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(new Date('2022-06-01T08:00:00.000Z'));
      }
    });

    it('fails decoding when invalid date', () => {
      expect(dateType.safeParse('invalid date').success).toBe(false);
    });
  });

  describe('settingsSchema', () => {
    const requiredSettings = {
      syncDelay: '1m',
      frequency: '1m',
      preventInitialBackfill: false,
    };

    it('decodes when preventCrossProjectSearch is absent', () => {
      const result = settingsSchema.safeParse(requiredSettings);
      expect(result.success).toBe(true);
    });

    it('decodes when preventCrossProjectSearch is present', () => {
      const result = settingsSchema.safeParse({
        ...requiredSettings,
        preventCrossProjectSearch: false,
      });
      expect(result.success).toBe(true);
    });

    it('decodes a valid projectRoutings string', () => {
      const result = settingsSchema.safeParse({
        ...requiredSettings,
        projectRoutings: '_alias:_origin',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectRoutings).toBe('_alias:_origin');
      }
    });

    it('decodes when projectRoutings is omitted', () => {
      const result = settingsSchema.safeParse(requiredSettings);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectRoutings).toBeUndefined();
      }
    });

    it('decodes when projectRoutings is null', () => {
      const result = settingsSchema.safeParse({
        ...requiredSettings,
        projectRoutings: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectRoutings).toBeNull();
      }
    });

    it('decodes projectRoutings of exactly 8192 characters', () => {
      const result = settingsSchema.safeParse({
        ...requiredSettings,
        projectRoutings: 'x'.repeat(8192),
      });
      expect(result.success).toBe(true);
    });

    it('rejects projectRoutings longer than 8192 characters', () => {
      const result = settingsSchema.safeParse({
        ...requiredSettings,
        preventCrossProjectSearch: false,
        projectRoutings: 'x'.repeat(8193),
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty string projectRoutings', () => {
      const result = settingsSchema.safeParse({
        ...requiredSettings,
        projectRoutings: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects whitespace-only projectRoutings', () => {
      const result = settingsSchema.safeParse({
        ...requiredSettings,
        projectRoutings: '   ',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('optionalSettingsSchema', () => {
    it('decodes when preventCrossProjectSearch is absent', () => {
      const result = optionalSettingsSchema.safeParse({
        syncDelay: '1m',
        frequency: '1m',
      });
      expect(result.success).toBe(true);
    });

    it('decodes when preventCrossProjectSearch is present', () => {
      const result = optionalSettingsSchema.safeParse({ preventCrossProjectSearch: true });
      expect(result.success).toBe(true);
    });

    it('decodes a valid projectRoutings string', () => {
      const result = optionalSettingsSchema.safeParse({ projectRoutings: '_alias:*' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectRoutings).toBe('_alias:*');
      }
    });

    it('decodes when projectRoutings is omitted', () => {
      const result = optionalSettingsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectRoutings).toBeUndefined();
      }
    });

    it('decodes when projectRoutings is null', () => {
      const result = optionalSettingsSchema.safeParse({ projectRoutings: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectRoutings).toBeNull();
      }
    });

    it('decodes projectRoutings of exactly 8192 characters', () => {
      const result = optionalSettingsSchema.safeParse({ projectRoutings: 'x'.repeat(8192) });
      expect(result.success).toBe(true);
    });

    it('rejects projectRoutings longer than 8192 characters', () => {
      const result = optionalSettingsSchema.safeParse({ projectRoutings: 'x'.repeat(8193) });
      expect(result.success).toBe(false);
    });

    it('rejects empty string projectRoutings', () => {
      const result = optionalSettingsSchema.safeParse({ projectRoutings: '' });
      expect(result.success).toBe(false);
    });

    it('rejects whitespace-only projectRoutings', () => {
      const result = optionalSettingsSchema.safeParse({ projectRoutings: '   ' });
      expect(result.success).toBe(false);
    });
  });
});
