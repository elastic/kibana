/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPatternTesterWorkerConfig } from './pattern_tester_worker_config';

describe('createPatternTesterWorkerConfig', () => {
  it('bounds the pool so a pathological pattern is cut off quickly and cannot queue up', () => {
    const config = createPatternTesterWorkerConfig({ enabled: true });

    expect(config.maxThreads).toBe(1);
    expect(config.minThreads).toBe(0);
    expect(config.maxQueue).toBeLessThanOrEqual(5);
    expect(config.taskTimeout.asMilliseconds()).toBeLessThanOrEqual(2000);
  });

  it('keeps the caller choice of running with or without worker threads', () => {
    expect(createPatternTesterWorkerConfig({ enabled: true }).enabled).toBe(true);
    expect(createPatternTesterWorkerConfig({ enabled: false }).enabled).toBe(false);
  });
});
