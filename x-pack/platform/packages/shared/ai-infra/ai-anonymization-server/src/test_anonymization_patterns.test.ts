/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { RegexAnonymizationRule } from '@kbn/ai-anonymization-common';
import { RegexWorkerService } from './regex_worker_service';
import { testAnonymizationPatterns } from './test_anonymization_patterns';
import type { AnonymizationWorkerConfig } from './types';

const EMAIL_PATTERN = '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}';

const emailRule = (overrides: Partial<RegexAnonymizationRule> = {}): RegexAnonymizationRule => ({
  type: 'RegExp',
  enabled: true,
  entityClass: 'EMAIL',
  pattern: EMAIL_PATTERN,
  ...overrides,
});

describe('testAnonymizationPatterns', () => {
  const logger = loggingSystemMock.createLogger();
  // Workers disabled: tasks run synchronously, which is enough to exercise the masking logic.
  const regexWorker = new RegexWorkerService(
    { enabled: false } as AnonymizationWorkerConfig,
    logger
  );
  const esClient = {} as ElasticsearchClient;

  const run = (input: unknown, rules: RegexAnonymizationRule[]) =>
    testAnonymizationPatterns({ input, rules, regexWorker, esClient, logger });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('masks matching values and returns a breakdown', async () => {
    const result = await run({ contact: 'a.mehta@example.com', note: 'reach out' }, [emailRule()]);

    expect(result.maskedInput).toEqual({
      contact: expect.stringContaining('EMAIL_'),
      note: 'reach out',
    });
    expect(result.anonymizations).toEqual([
      expect.objectContaining({ entityType: 'EMAIL', originalValue: 'a.mehta@example.com' }),
    ]);
    expect(result.stats).toEqual({ valuesMasked: 1, uniqueValues: 1, rulesApplied: 1 });
  });

  it('masks a plain string input, not only JSON objects', async () => {
    const result = await run('mail a.mehta@example.com about 10.0.0.1', [emailRule()]);

    expect(typeof result.maskedInput).toBe('string');
    expect(result.maskedInput).toMatch(/^mail EMAIL_\w+ about 10\.0\.0\.1$/);
    expect(result.stats).toEqual({ valuesMasked: 1, uniqueValues: 1, rulesApplied: 1 });
  });

  it('ignores disabled rules', async () => {
    const result = await run({ contact: 'a.mehta@example.com' }, [emailRule({ enabled: false })]);

    expect(result.maskedInput).toEqual({ contact: 'a.mehta@example.com' });
    expect(result.stats).toEqual({ valuesMasked: 0, uniqueValues: 0, rulesApplied: 0 });
  });

  it('counts repeated occurrences of one value once in the breakdown', async () => {
    const result = await run('a@example.com and a@example.com', [emailRule()]);

    expect(result.stats).toEqual({ valuesMasked: 2, uniqueValues: 1, rulesApplied: 1 });
    expect(result.anonymizations).toEqual([expect.objectContaining({ occurrences: 2 })]);
  });

  it('throws when a pattern does not compile, instead of reporting "0 masked"', async () => {
    await expect(
      run({ contact: 'a.mehta@example.com' }, [emailRule({ pattern: '(unclosed' })])
    ).rejects.toThrow(/invalid regular expression/);
  });

  it('throws when the pattern exceeds the worker timeout', async () => {
    jest
      .spyOn(RegexWorkerService.prototype, 'run')
      .mockRejectedValueOnce(new Error('Regex anonymization task timed out'));

    await expect(
      run({ contact: 'x' }, [emailRule({ entityClass: 'ENTITY_NAME', pattern: '(a+)+$' })])
    ).rejects.toThrow(/timed out/);
  });
});
