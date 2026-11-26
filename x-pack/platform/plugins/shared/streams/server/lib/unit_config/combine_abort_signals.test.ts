/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineAbortSignals } from './combine_abort_signals';

describe('combineAbortSignals', () => {
  it.each([0, 1])('aborts when input %i aborts', (index) => {
    const controllers = [new AbortController(), new AbortController()];
    const { signal } = combineAbortSignals(controllers.map((controller) => controller.signal));

    expect(signal.aborted).toBe(false);
    controllers[index].abort();
    expect(signal.aborted).toBe(true);
  });

  it('is aborted from the start when an input already is', () => {
    const controller = new AbortController();
    controller.abort();

    expect(combineAbortSignals([controller.signal]).signal.aborted).toBe(true);
  });

  it('ignores undefined inputs', () => {
    const controller = new AbortController();
    const { signal } = combineAbortSignals([undefined, controller.signal]);

    controller.abort();

    expect(signal.aborted).toBe(true);
  });

  it('stops following the inputs after dispose', () => {
    const controller = new AbortController();
    const removeEventListener = jest.spyOn(controller.signal, 'removeEventListener');
    const { signal, dispose } = combineAbortSignals([controller.signal]);

    dispose();
    controller.abort();

    expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(signal.aborted).toBe(false);
  });
});
