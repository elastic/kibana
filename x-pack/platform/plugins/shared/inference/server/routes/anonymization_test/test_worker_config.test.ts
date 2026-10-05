/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { AnonymizationWorkerConfig } from '../../config';
import { createTestWorkerConfig } from './test_worker_config';

const productionConfig: AnonymizationWorkerConfig = {
  enabled: true,
  minThreads: 2,
  maxThreads: 3,
  maxQueue: 20,
  idleTimeout: moment.duration(30, 'seconds'),
  taskTimeout: moment.duration(15, 'seconds'),
};

describe('createTestWorkerConfig', () => {
  it('bounds the pattern-tester pool so a pathological pattern is cut off quickly and cannot queue up', () => {
    const config = createTestWorkerConfig(productionConfig);

    expect(config.maxThreads).toBe(1);
    expect(config.minThreads).toBe(0);
    expect(config.maxQueue).toBeLessThan(productionConfig.maxQueue);
    expect(config.taskTimeout.asMilliseconds()).toBeLessThan(
      productionConfig.taskTimeout.asMilliseconds()
    );
  });

  it('never lengthens a timeout an operator already shortened', () => {
    const config = createTestWorkerConfig({
      ...productionConfig,
      taskTimeout: moment.duration(500, 'milliseconds'),
    });

    expect(config.taskTimeout.asMilliseconds()).toBe(500);
  });

  it('keeps the operator choice of running with or without worker threads', () => {
    expect(createTestWorkerConfig({ ...productionConfig, enabled: false }).enabled).toBe(false);
  });
});
