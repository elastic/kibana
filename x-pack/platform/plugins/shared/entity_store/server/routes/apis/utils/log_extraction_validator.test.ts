/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { LogExtractionConfig } from '../../../domain/saved_objects';
import { findEffectiveConfigError, LogExtractionInstallSchema } from './log_extraction_validator';

const TestSchema = z.object({ logExtraction: LogExtractionInstallSchema });

describe('LogExtractionInstallParams additionalIndexPatterns', () => {
  it('accepts valid index patterns', () => {
    const result = TestSchema.safeParse({
      logExtraction: { additionalIndexPatterns: ['logs-*', 'metrics-*', 'valid_index'] },
    });
    expect(result.success).toBe(true);
  });

  it('rejects index patterns containing illegal characters', () => {
    const result = TestSchema.safeParse({
      logExtraction: { additionalIndexPatterns: ['invalid pattern'] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'logExtraction' && i.path[1] === 'additionalIndexPatterns'
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toContain(' ');
    }
  });

  it('rejects index pattern with pipe or quote (validateDataView illegal chars)', () => {
    const result = TestSchema.safeParse({
      logExtraction: { additionalIndexPatterns: ['index|pipe', 'index"quote'] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(
        result.error.issues.some((i) =>
          typeof i.message === 'string'
            ? i.message.includes('illegal characters') || i.message.includes('valid index pattern')
            : false
        )
      ).toBe(true);
    }
  });

  it('reports path with index for invalid entry', () => {
    const result = TestSchema.safeParse({
      logExtraction: { additionalIndexPatterns: ['valid', 'bad one', 'also valid'] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => Array.isArray(i.path) && i.path[2] === 1);
      expect(issue).toBeDefined();
    }
  });
});

describe('findEffectiveConfigError', () => {
  const config = (overrides: Partial<LogExtractionConfig>) =>
    ({ frequency: '1m', delay: '1m', lookbackPeriod: '3h', ...overrides } as LogExtractionConfig);

  it('accepts a config where delay is below the lookback period', () => {
    expect(findEffectiveConfigError(config({}))).toBeNull();
  });

  // The per-block schema check compares against the built-in 3h default, so it passes a delay
  // that only breaks once a shorter stored lookbackPeriod is merged in.
  it('rejects a delay that is not below the merged lookback period', () => {
    expect(findEffectiveConfigError(config({ delay: '5m', lookbackPeriod: '2m' }))).toContain(
      'must be less than lookbackPeriod'
    );
  });

  it('rejects a frequency below 30 seconds', () => {
    expect(findEffectiveConfigError(config({ frequency: '10s' }))).toContain('30 seconds');
  });
});
