/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CancellationScope } from './cancellation_scope';

describe('CancellationScope', () => {
  it('calls all disposers on disposeAll', async () => {
    const scope = new CancellationScope();
    const disposer1 = jest.fn();
    const disposer2 = jest.fn();

    scope.add(disposer1);
    scope.add(disposer2);

    await scope.disposeAll();

    expect(disposer1).toHaveBeenCalledTimes(1);
    expect(disposer2).toHaveBeenCalledTimes(1);
  });

  it('disposes in LIFO order (last added first)', async () => {
    const scope = new CancellationScope();
    const order: string[] = [];

    scope.add(() => {
      order.push('first');
    });
    scope.add(() => {
      order.push('second');
    });
    scope.add(() => {
      order.push('third');
    });

    await scope.disposeAll();

    expect(order).toEqual(['third', 'second', 'first']);
  });

  it('handles async disposers', async () => {
    const scope = new CancellationScope();
    const disposed = jest.fn();

    scope.add(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      disposed();
    });

    await scope.disposeAll();

    expect(disposed).toHaveBeenCalledTimes(1);
  });

  it('completes without error when no disposers are registered', async () => {
    const scope = new CancellationScope();

    await expect(scope.disposeAll()).resolves.toBeUndefined();
  });

  it('throws first error but still calls remaining disposers', async () => {
    const scope = new CancellationScope();
    const disposer1 = jest.fn();
    const disposer2 = jest.fn(() => {
      throw new Error('disposer 2 failed');
    });
    const disposer3 = jest.fn(() => {
      throw new Error('disposer 3 failed');
    });

    scope.add(disposer1);
    scope.add(disposer2);
    scope.add(disposer3);

    await expect(scope.disposeAll()).rejects.toThrow('disposer 3 failed');

    expect(disposer1).toHaveBeenCalledTimes(1);
    expect(disposer2).toHaveBeenCalledTimes(1);
    expect(disposer3).toHaveBeenCalledTimes(1);
  });

  it('clears disposers after disposeAll', async () => {
    const scope = new CancellationScope();
    const disposer = jest.fn();

    scope.add(disposer);
    await scope.disposeAll();
    await scope.disposeAll();

    expect(disposer).toHaveBeenCalledTimes(1);
  });
});
