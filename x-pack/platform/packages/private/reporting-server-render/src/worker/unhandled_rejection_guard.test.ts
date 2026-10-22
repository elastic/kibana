/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withUnhandledRejectionGuard } from './unhandled_rejection_guard';

describe('withUnhandledRejectionGuard', () => {
  // Deliberately drives `process.emit('unhandledRejection', ...)` directly rather than
  // leaving a real promise unhandled and waiting for Node to flag it: Jest's own test
  // runner (jest-circus) independently attributes a genuinely-unhandled rejection to
  // whichever test was running when Node notices it, regardless of this guard's listener
  // swap, which makes that timing non-deterministic under Jest specifically. Emitting the
  // event directly exercises exactly what this guard promises -- its listener receives the
  // event, and the previously-registered listener (stood in for by `otherListener` here)
  // does not -- without depending on Jest's/Node's own unhandled-rejection scheduling.
  it('routes an emitted unhandledRejection to onRejection, not whatever listener was registered before it', async () => {
    const onRejection = jest.fn();
    const otherListener = jest.fn();
    process.on('unhandledRejection', otherListener);

    try {
      await withUnhandledRejectionGuard(async () => {
        const reason = new Error('boom');
        process.emit('unhandledRejection', reason, Promise.resolve());
        return 'done';
      }, onRejection);

      expect(onRejection).toHaveBeenCalledTimes(1);
      expect((onRejection.mock.calls[0][0] as Error).message).toBe('boom');
      expect(otherListener).not.toHaveBeenCalled();
    } finally {
      process.removeListener('unhandledRejection', otherListener);
    }
  });

  it('restores the previously-registered listeners once fn settles, even on throw', async () => {
    const previous = jest.fn();
    process.on('unhandledRejection', previous);

    await expect(
      withUnhandledRejectionGuard(async () => {
        throw new Error('fn failed');
      }, jest.fn())
    ).rejects.toThrow('fn failed');

    expect(process.listeners('unhandledRejection')).toContain(previous);
    process.removeListener('unhandledRejection', previous);
  });

  it('still returns fn`s resolved value', async () => {
    const result = await withUnhandledRejectionGuard(async () => 42, jest.fn());
    expect(result).toBe(42);
  });
});
