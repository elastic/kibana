/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  emitHitlLifecycle,
  type HitlLifecycleEvent,
  registerHitlLifecycleAuditor,
} from './hitl_lifecycle_auditor';

describe('hitl_lifecycle_auditor', () => {
  afterEach(() => {
    // Ensure no auditor leaks across tests.
    registerHitlLifecycleAuditor(() => undefined)();
  });

  it('registers an auditor and returns a disposer that clears only that registration', () => {
    const first = jest.fn();
    const second = jest.fn();
    const disposeFirst = registerHitlLifecycleAuditor(first);
    const disposeSecond = registerHitlLifecycleAuditor(second);

    const event: HitlLifecycleEvent = { type: 'canceled', executionId: 'e-1' };
    emitHitlLifecycle(event);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(event);

    disposeFirst();
    emitHitlLifecycle(event);
    expect(second).toHaveBeenCalledTimes(2);

    disposeSecond();
    emitHitlLifecycle(event);
    expect(second).toHaveBeenCalledTimes(2);
  });
});
