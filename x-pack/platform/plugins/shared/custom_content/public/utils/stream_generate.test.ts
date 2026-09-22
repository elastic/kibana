/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, throwError } from 'rxjs';
import type { HttpStart } from '@kbn/core/public';
import { streamGenerate } from './stream_generate';

jest.mock('@kbn/sse-utils-client', () => ({
  httpResponseIntoObservable: () => (source$: unknown) => source$,
}));

function makeHttp(events: Array<{ type: string; token?: string }>): HttpStart {
  return {
    post: jest.fn().mockReturnValue(of(...events)),
  } as unknown as HttpStart;
}

const signal = new AbortController().signal;
const baseParams = { prompt: 'Show KPI cards', colorMode: 'LIGHT' as const };

describe('streamGenerate', () => {
  it('calls onToken for each token event', async () => {
    const http = makeHttp([
      { type: 'token', token: '<div>' },
      { type: 'token', token: 'hello</div>' },
    ]);
    const onToken = jest.fn();
    await streamGenerate(http, baseParams, onToken, signal);
    expect(onToken).toHaveBeenCalledWith('<div>');
    expect(onToken).toHaveBeenCalledWith('hello</div>');
    expect(onToken).toHaveBeenCalledTimes(2);
  });

  it('ignores events that are not token type', async () => {
    const http = makeHttp([{ type: 'other' }, { type: 'token', token: 'ok' }]);
    const onToken = jest.fn();
    await streamGenerate(http, baseParams, onToken, signal);
    expect(onToken).toHaveBeenCalledTimes(1);
    expect(onToken).toHaveBeenCalledWith('ok');
  });

  it('rejects with a coded error when a ServerSentEventError is received', async () => {
    const { ServerSentEventError } = jest.requireActual('@kbn/sse-utils');
    const http = {
      post: jest
        .fn()
        .mockReturnValue(
          throwError(() => new ServerSentEventError('no_connector', 'No connector', {}))
        ),
    } as unknown as HttpStart;
    const onToken = jest.fn();
    const err = await streamGenerate(http, baseParams, onToken, signal).catch((e) => e);
    expect(err.message).toBe('No connector');
    expect(err.code).toBe('no_connector');
    expect(onToken).not.toHaveBeenCalled();
  });

  it('rejects with the raw error for non-SSE errors', async () => {
    const http = {
      post: jest.fn().mockReturnValue(throwError(() => new Error('network error'))),
    } as unknown as HttpStart;
    const err = await streamGenerate(http, baseParams, jest.fn(), signal).catch((e) => e);
    expect(err.message).toBe('network error');
    expect(err.code).toBeUndefined();
  });
});
