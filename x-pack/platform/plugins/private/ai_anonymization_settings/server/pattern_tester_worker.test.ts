/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { RegexWorkerService } from '@kbn/ai-anonymization-server';
import { PatternTesterWorker } from './pattern_tester_worker';

describe('PatternTesterWorker', () => {
  const logger = loggingSystemMock.createLogger();
  let provider: PatternTesterWorker;

  const create = (enabledByConfig: boolean) => {
    provider = new PatternTesterWorker({ enabledByConfig, logger });
    return provider;
  };

  afterEach(async () => {
    await provider?.stop();
    jest.restoreAllMocks();
  });

  it('runs on worker threads by default', () => {
    expect(create(true).get().isEnabled()).toBe(true);
  });

  it('reuses one pool across requests', () => {
    const worker = create(true);
    expect(worker.get()).toBe(worker.get());
  });

  it('is disabled when the plugin config disables it', () => {
    expect(create(false).get().isEnabled()).toBe(false);
  });

  it('is disabled when the host reports it runs without worker threads', () => {
    const worker = create(true);
    worker.configure({ enabled: false });

    expect(worker.get().isEnabled()).toBe(false);
  });

  it('never re-enables what the plugin config disabled, whatever the host reports', () => {
    const worker = create(false);
    worker.configure({ enabled: true });

    expect(worker.get().isEnabled()).toBe(false);
  });

  it('applies a host configuration that arrives after the pool was already created', () => {
    const stopSpy = jest.spyOn(RegexWorkerService.prototype, 'stop');
    const worker = create(true);
    const before = worker.get();

    worker.configure({ enabled: false });
    const after = worker.get();

    expect(after).not.toBe(before);
    expect(after.isEnabled()).toBe(false);
    expect(stopSpy).toHaveBeenCalledTimes(1);
  });
});
