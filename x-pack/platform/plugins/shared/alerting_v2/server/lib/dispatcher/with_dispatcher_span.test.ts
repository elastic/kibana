/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const mockSpanState: { current: null | { addLabels: jest.Mock } } = { current: null };

jest.mock('@kbn/apm-utils', () => ({
  __esModule: true,
  withSpan: jest.fn(async (_opts, cb) => cb(mockSpanState.current)),
}));

import { withSpan } from '@kbn/apm-utils';
import { withDispatcherSpan } from './with_dispatcher_span';

describe('withDispatcherSpan', () => {
  beforeEach(() => {
    mockSpanState.current = null;
    jest.clearAllMocks();
  });

  it('invokes withSpan with dispatcher-scoped name, type, and static labels', async () => {
    const cb = jest.fn(async () => 'result');

    await withDispatcherSpan('fetch_episodes', cb);

    expect(withSpan).toHaveBeenCalledTimes(1);
    const [spanOptions] = (withSpan as jest.Mock).mock.calls[0];
    expect(spanOptions).toEqual({
      name: 'dispatcher:fetch_episodes',
      type: 'dispatcher',
      labels: { plugin: 'alerting_v2' },
    });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('returns the callback result unchanged', async () => {
    const result = await withDispatcherSpan('step', async () => ({ ok: true }));
    expect(result).toEqual({ ok: true });
  });

  it('attaches dynamic labels from the factory to the span provided by withSpan', async () => {
    const addLabels = jest.fn();
    mockSpanState.current = { addLabels };

    await withDispatcherSpan(
      'fetch_episodes',
      async () => ({ produced: 42 }),
      (out) => ({ count_episodes: out.produced })
    );

    expect(addLabels).toHaveBeenCalledWith({ count_episodes: 42 });
  });

  it('does not throw when withSpan provides no span', async () => {
    mockSpanState.current = null;

    await expect(
      withDispatcherSpan(
        'step',
        async () => 1,
        () => ({ count_episodes: 1 })
      )
    ).resolves.toBe(1);
  });

  it('swallows label factory errors', async () => {
    const addLabels = jest.fn();
    mockSpanState.current = { addLabels };

    await expect(
      withDispatcherSpan(
        'step',
        async () => 'done',
        () => {
          throw new Error('oops');
        }
      )
    ).resolves.toBe('done');

    expect(addLabels).not.toHaveBeenCalled();
  });

  it('propagates errors thrown by the callback', async () => {
    await expect(
      withDispatcherSpan('step', async () => {
        throw new Error('bang');
      })
    ).rejects.toThrow('bang');
  });
});
