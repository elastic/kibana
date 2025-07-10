/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnonymizationRule } from '@kbn/inference-common';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { RegexWorkerService } from './regex_worker_service';
import { AnonymizationWorkerConfig } from '../../config';

const regexEmailRule: AnonymizationRule = {
  type: 'RegExp',
  enabled: true,
  entityClass: 'EMAIL',
  pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
};
const backTrackingRule: AnonymizationRule = {
  type: 'RegExp',
  enabled: true,
  entityClass: 'TEST',
  pattern: '(a+)+$',
};
const taskPayload = {
  records: [{ email: 'jorge21@gmail.com' }],
  rule: regexEmailRule,
};
function createTestConfig(
  overrides: Partial<AnonymizationWorkerConfig> = {}
): AnonymizationWorkerConfig {
  return {
    enabled: true,
    minThreads: 1,
    maxThreads: 3,
    idleTimeout: { asMilliseconds: () => 30000 },
    taskTimeout: { asMilliseconds: () => 15000 },
    ...overrides,
  } as AnonymizationWorkerConfig;
}

describe('RegexWorkerService', () => {
  let logger: MockedLogger;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggerMock.create();
  });

  it('anonymizes through the worker', async () => {
    const regexWorker = new RegexWorkerService(createTestConfig(), logger);
    const result = await regexWorker.run(taskPayload);
    const worker = (regexWorker as any).worker;
    expect(worker.threads.length).toBeGreaterThanOrEqual(1);
    expect(result.records[0].email).not.toContain('jorge21@gmail.com');
    expect(result.anonymizations.length).toBe(1);
  });
  it('times out task if greater than taskTimeout time', async () => {
    const regexWorker = new RegexWorkerService(
      createTestConfig({ taskTimeout: { asMilliseconds: () => 1 } } as any),
      logger
    );
    const longA = 'a'.repeat(10_000) + 'b';
    await expect(
      regexWorker.run({
        records: [{ content: longA }],
        rule: backTrackingRule,
      })
    ).rejects.toThrow('Regex anonymization task timed out');
  });
  it('runs task synchronously when worker is disabled', async () => {
    const regexWorker = new RegexWorkerService(createTestConfig({ enabled: false }), logger);
    const result = await regexWorker.run(taskPayload);
    const worker = (regexWorker as any).worker;
    expect(worker).toBeUndefined();
    expect(result.records[0].email).not.toContain('jorge21@gmail.com');
    expect(result.anonymizations.length).toBe(1);
  });
});
