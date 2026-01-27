/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of, take } from 'rxjs';
import { Readable } from 'stream';
import type { InferenceInvokeResult } from './inference_executor';
import { handleConnectorStreamResponse } from './handle_connector_response';

const stubResult = <T>(parts: Partial<InferenceInvokeResult<T>>): InferenceInvokeResult<T> => {
  return {
    actionId: 'actionId',
    status: 'ok',
    ...parts,
  };
};

describe('handleConnectorResponse', () => {
  it('emits the output from `processStream`', async () => {
    const stream = Readable.from('hello');
    const input = stubResult({ data: stream });

    const processStream = jest.fn().mockImplementation((arg: unknown) => {
      return of(arg);
    });

    const output = await firstValueFrom(
      of(input).pipe(handleConnectorStreamResponse({ processStream }), take(1))
    );

    expect(processStream).toHaveBeenCalledTimes(1);
    expect(processStream).toHaveBeenCalledWith(stream);

    expect(output).toEqual(stream);
  });

  it('errors when the response status is error', async () => {
    const input = stubResult({
      data: undefined,
      status: 'error',
      serviceMessage: 'something went bad',
    });

    const processStream = jest.fn().mockImplementation((arg: unknown) => {
      return of(arg);
    });

    await expect(
      firstValueFrom(of(input).pipe(handleConnectorStreamResponse({ processStream }), take(1)))
    ).rejects.toThrowError(/something went bad/);
  });

  it('errors when the response data is not a readable stream', async () => {
    const input = stubResult({
      data: 'not a stream',
      status: 'ok',
    });

    const processStream = jest.fn().mockImplementation((arg: unknown) => {
      return of(arg);
    });

    await expect(
      firstValueFrom(of(input).pipe(handleConnectorStreamResponse({ processStream }), take(1)))
    ).rejects.toThrowError(/Unexpected error/);
  });
});
