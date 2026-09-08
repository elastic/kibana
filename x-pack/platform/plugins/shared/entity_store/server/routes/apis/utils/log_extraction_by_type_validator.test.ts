/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { LogExtractionByTypeSchema, LogExtractionInstallSchema } from './log_extraction_validator';

const InstallTestSchema = z.object({ logExtraction: LogExtractionInstallSchema });

describe('LogExtractionByTypeSchema', () => {
  it('accepts a single entity type entry', () => {
    const result = LogExtractionByTypeSchema.safeParse({
      user: { frequency: '5m', lookbackPeriod: '6h' },
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ user: { frequency: '5m', lookbackPeriod: '6h' } });
  });

  it('accepts several entity types in the same object', () => {
    const params = {
      user: { frequency: '5m' },
      host: { lookbackPeriod: '6h' },
      service: { docsLimit: 500 },
      generic: { additionalIndexPatterns: ['logs-*'] },
    };

    const result = LogExtractionByTypeSchema.safeParse(params);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(params);
  });

  it('accepts an empty object for an entity type as a no-op', () => {
    const result = LogExtractionByTypeSchema.safeParse({ user: {} });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ user: {} });
  });

  it('rejects an unknown entity type key', () => {
    const result = LogExtractionByTypeSchema.safeParse({ not_an_entity_type: { frequency: '5m' } });

    expect(result.success).toBe(false);
  });

  describe('cleared fields', () => {
    it('accepts null for a field without tripping the frequency minimum or delay checks', () => {
      const result = LogExtractionByTypeSchema.safeParse({
        user: { frequency: null, delay: null },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ user: { frequency: null, delay: null } });
    });

    it('accepts a null delay alongside a supplied lookbackPeriod', () => {
      const result = LogExtractionByTypeSchema.safeParse({
        user: { delay: null, lookbackPeriod: '30m' },
      });

      expect(result.success).toBe(true);
    });

    it('accepts null for every overridable field', () => {
      const cleared = {
        additionalIndexPatterns: null,
        excludedIndexPatterns: null,
        lookbackPeriod: null,
        delay: null,
        docsLimit: null,
        maxLogsPerPage: null,
        frequency: null,
        maxTimeWindowSize: null,
        maxLogsPerWindow: null,
        maxLogsPerWindowCapBehavior: null,
      };

      const result = LogExtractionByTypeSchema.safeParse({ user: cleared });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ user: cleared });
    });
  });

  describe('frequency', () => {
    it('rejects a frequency below 30 seconds and reports the entity type and field in the path', () => {
      const result = LogExtractionByTypeSchema.safeParse({ host: { frequency: '10s' } });

      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([['host', 'frequency']]);
    });

    it('accepts a frequency of exactly 30 seconds', () => {
      const result = LogExtractionByTypeSchema.safeParse({ host: { frequency: '30s' } });

      expect(result.success).toBe(true);
    });
  });

  describe('delay vs lookbackPeriod', () => {
    it('rejects a delay greater than the lookbackPeriod', () => {
      const result = LogExtractionByTypeSchema.safeParse({
        user: { delay: '2h', lookbackPeriod: '1h' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([['user', 'delay']]);
    });

    it('rejects a delay equal to the lookbackPeriod', () => {
      const result = LogExtractionByTypeSchema.safeParse({
        user: { delay: '1h', lookbackPeriod: '1h' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([['user', 'delay']]);
    });
  });

  describe('index patterns', () => {
    it('rejects an index pattern containing a space and reports the array index in the path', () => {
      const result = LogExtractionByTypeSchema.safeParse({
        user: { additionalIndexPatterns: ['logs-*', 'invalid pattern'] },
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([
        ['user', 'additionalIndexPatterns', 1],
      ]);
    });

    it('rejects an index pattern containing an illegal character', () => {
      const result = LogExtractionByTypeSchema.safeParse({
        service: { excludedIndexPatterns: ['index|pipe'] },
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([
        ['service', 'excludedIndexPatterns', 0],
      ]);
    });
  });

  describe('fields excluded from the per entity-type layer', () => {
    it('does not carry timeout through, since it is never read at runtime', () => {
      const result = LogExtractionByTypeSchema.safeParse({
        user: { frequency: '5m', timeout: '30s' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ user: { frequency: '5m' } });
    });

    it('does not carry fieldHistoryLength through, since it is never read at runtime', () => {
      const result = LogExtractionByTypeSchema.safeParse({
        user: { frequency: '5m', fieldHistoryLength: 20 },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ user: { frequency: '5m' } });
    });
  });
});

describe('LogExtractionInstallSchema', () => {
  it('accepts null for a field, clearing the store-wide override', () => {
    const result = InstallTestSchema.safeParse({
      logExtraction: { frequency: null, lookbackPeriod: null },
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ logExtraction: { frequency: null, lookbackPeriod: null } });
  });

  it('accepts a null delay without tripping the delay-vs-lookbackPeriod check', () => {
    const result = InstallTestSchema.safeParse({
      logExtraction: { delay: null, lookbackPeriod: '30m' },
    });

    expect(result.success).toBe(true);
  });

  it('still rejects a frequency below 30 seconds when a value is supplied', () => {
    const result = InstallTestSchema.safeParse({ logExtraction: { frequency: '10s' } });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ['logExtraction', 'frequency'],
    ]);
  });
});
