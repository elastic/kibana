/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import { withApm as withApmDecorator } from './with_apm_decorator';

jest.mock('@kbn/apm-utils', () => ({
  withSpan: jest.fn(<T>(_opts: unknown, cb: () => Promise<T>) => cb() as Promise<T>),
}));

const withSpanMock = withSpan as jest.MockedFunction<typeof withSpan>;

const withApm = withApmDecorator('test_client');

class TestClient {
  @withApm
  async doWork(): Promise<string> {
    return 'done';
  }

  @withApm
  async fail(): Promise<never> {
    throw new Error('decorated error');
  }
}

describe('withApm decorator', () => {
  let client: TestClient;

  beforeEach(() => {
    withSpanMock.mockClear();
    client = new TestClient();
  });

  it('wraps an async method in withSpan using the given type and method name', async () => {
    const result = await client.doWork();

    expect(result).toBe('done');
    expect(withSpanMock).toHaveBeenCalledTimes(1);
    expect(withSpanMock).toHaveBeenCalledWith(
      {
        name: 'doWork',
        type: 'test_client',
        labels: { plugin: 'alerting_v2' },
      },
      expect.any(Function)
    );
  });

  it('propagates errors from the decorated method', async () => {
    await expect(client.fail()).rejects.toThrow('decorated error');
    expect(withSpanMock).toHaveBeenCalledTimes(1);
  });
});
