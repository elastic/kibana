/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { PiiRegexWorkerService } from './regex_worker_service';
import type { AnonymizationWorkerConfig } from '../../config';
import type { PiiRegexWorkerTaskPayload } from './types';

function createTestConfig(
  overrides: Partial<AnonymizationWorkerConfig> = {}
): AnonymizationWorkerConfig {
  return {
    enabled: true,
    minThreads: 1,
    maxThreads: 2,
    maxQueue: 20,
    idleTimeout: { asMilliseconds: () => 30_000 },
    taskTimeout: { asMilliseconds: () => 15_000 },
    ...overrides,
  } as AnonymizationWorkerConfig;
}

const IP_PAYLOAD: PiiRegexWorkerTaskPayload = {
  rules: [{ entityClass: 'IP', pattern: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b' }],
  records: [{ content: 'connect to 10.0.0.1' }],
};

describe('PiiRegexWorkerService', () => {
  let logger: MockedLogger;
  let service: PiiRegexWorkerService;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggerMock.create();
  });

  afterEach(async () => {
    await (service as any).worker?.destroy({ force: true });
  });

  it('executes rules through the worker pool and returns matches', async () => {
    service = new PiiRegexWorkerService(createTestConfig(), logger);
    const results = await service.run(IP_PAYLOAD);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      entityClass: 'IP',
      matchValue: '10.0.0.1',
      recordIndex: 0,
      recordKey: 'content',
      ruleIndex: 0,
      start: expect.any(Number),
      end: expect.any(Number),
    });
  });

  it('runs synchronously when the worker pool is disabled', async () => {
    service = new PiiRegexWorkerService(createTestConfig({ enabled: false }), logger);
    const results = await service.run(IP_PAYLOAD);

    expect((service as any).worker).toBeUndefined();
    expect(results).toHaveLength(1);
    expect(results[0].matchValue).toBe('10.0.0.1');
  });

  it('aborts the task and recreates the pool when taskTimeout elapses', async () => {
    service = new PiiRegexWorkerService(
      createTestConfig({ taskTimeout: { asMilliseconds: () => 1 } } as any),
      logger
    );
    const workerBefore = (service as any).worker;

    // (?=a)(a+)+$ falls back to native RegExp (RE2 rejects the lookahead) and
    // backtracks catastrophically on a long all-'a' string — guaranteed timeout.
    await expect(
      service.run({
        rules: [{ entityClass: 'MISC', pattern: '(?=a)(a+)+$' }],
        records: [{ content: 'a'.repeat(10_000) + 'b' }],
      })
    ).rejects.toThrow('timed out');

    // Pool is rebuilt after abort — the new instance is a different object
    expect((service as any).worker).not.toBe(workerBefore);
  });

  it('returns [] and logs when failureMode is allow_unsafe', async () => {
    service = new PiiRegexWorkerService(createTestConfig(), logger);
    const badPayload: PiiRegexWorkerTaskPayload = {
      rules: [{ entityClass: 'BAD', pattern: '(unclosed' }],
      records: [{ content: 'test' }],
    };

    const results = await service.run(badPayload, 'allow_unsafe');

    expect(results).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      'PII regex detection failed; proceeding without anonymization',
      expect.objectContaining({ error: expect.anything() })
    );
  });

  it('throws when failureMode is block (default)', async () => {
    service = new PiiRegexWorkerService(createTestConfig(), logger);
    const badPayload: PiiRegexWorkerTaskPayload = {
      rules: [{ entityClass: 'BAD', pattern: '(unclosed' }],
      records: [{ content: 'test' }],
    };

    await expect(service.run(badPayload)).rejects.toThrow();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
