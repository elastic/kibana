/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationRule } from '@kbn/inference-common';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { RegexWorkerService } from './regex_worker_service';
import type { AnonymizationWorkerConfig } from '../../config';

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
  records: [{ content: 'Contact me at jorge21@gmail.com for details' }],
  rules: [regexEmailRule],
};
function createTestConfig(
  overrides: Partial<AnonymizationWorkerConfig> = {}
): AnonymizationWorkerConfig {
  return {
    enabled: true,
    minThreads: 1,
    maxThreads: 3,
    maxQueue: 20,
    idleTimeout: { asMilliseconds: () => 30000 },
    taskTimeout: { asMilliseconds: () => 15000 },
    ...overrides,
  } as AnonymizationWorkerConfig;
}

describe('RegexWorkerService', () => {
  let logger: MockedLogger;
  let regexWorker: RegexWorkerService;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggerMock.create();
  });

  afterEach(async () => {
    // Force immediate termination of worker pools
    const piscinaWorker = (regexWorker as any).worker;
    piscinaWorker?.destroy({ force: true });
  });

  it('detects regex matches through the worker', async () => {
    regexWorker = new RegexWorkerService(createTestConfig(), logger);
    const result = await regexWorker.run(taskPayload);
    const worker = (regexWorker as any).worker;
    expect(worker).toBeDefined();
    expect(worker.completed).toBe(1);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]).toMatchObject({
      recordIndex: 0,
      recordKey: 'content',
      start: expect.any(Number),
      end: expect.any(Number),
      matchValue: 'jorge21@gmail.com',
      class_name: 'EMAIL',
      ruleIndex: 0,
    });

    // worker completed 2 tasks
    await regexWorker.run(taskPayload);
    expect(worker.completed).toBe(2);
  });
  it('times out task if greater than taskTimeout time', async () => {
    regexWorker = new RegexWorkerService(
      createTestConfig({ taskTimeout: { asMilliseconds: () => 1 } } as any),
      logger
    );
    const longA = 'a'.repeat(10_000) + 'b';
    await expect(
      regexWorker.run({
        records: [{ content: longA }],
        rules: [backTrackingRule],
      })
    ).rejects.toThrow('Regex anonymization task timed out');
  });
  it('runs task synchronously when worker is disabled', async () => {
    regexWorker = new RegexWorkerService(createTestConfig({ enabled: false }), logger);
    const result = await regexWorker.run(taskPayload);
    const worker = (regexWorker as any).worker;
    expect(worker).toBeUndefined();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]).toMatchObject({
      recordIndex: 0,
      recordKey: 'content',
      start: expect.any(Number),
      end: expect.any(Number),
      matchValue: 'jorge21@gmail.com',
      class_name: 'EMAIL',
      ruleIndex: 0,
    });
  });
});
