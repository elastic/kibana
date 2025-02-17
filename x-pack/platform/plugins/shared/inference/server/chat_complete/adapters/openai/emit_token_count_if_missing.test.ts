/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, toArray, lastValueFrom } from 'rxjs';
import { chunkEvent, tokensEvent } from '../../../test_utils';
import type { OpenAIRequest } from './types';
import { emitTokenCountEstimateIfMissing } from './emit_token_count_if_missing';

jest.mock('./manually_count_tokens');
import { manuallyCountPromptTokens, manuallyCountCompletionTokens } from './manually_count_tokens';
const manuallyCountPromptTokensMock = manuallyCountPromptTokens as jest.MockedFn<
  typeof manuallyCountPromptTokens
>;
const manuallyCountCompletionTokensMock = manuallyCountCompletionTokens as jest.MockedFn<
  typeof manuallyCountCompletionTokens
>;

const stubRequest = (content: string = 'foo'): OpenAIRequest => {
  return {
    messages: [{ role: 'user', content }],
  };
};

describe('emitTokenCountEstimateIfMissing', () => {
  beforeEach(() => {
    manuallyCountPromptTokensMock.mockReset();
    manuallyCountCompletionTokensMock.mockReset();
  });

  it('mirrors the source when token count is emitted', async () => {
    const events = [
      chunkEvent('chunk-1'),
      chunkEvent('chunk-2'),
      chunkEvent('chunk-3'),
      tokensEvent({ completion: 5, prompt: 10, total: 15 }),
    ];

    const result$ = of(...events).pipe(emitTokenCountEstimateIfMissing({ request: stubRequest() }));
    const output = await lastValueFrom(result$.pipe(toArray()));

    expect(output).toEqual(events);

    expect(manuallyCountPromptTokensMock).not.toHaveBeenCalled();
    expect(manuallyCountCompletionTokensMock).not.toHaveBeenCalled();
  });

  it('emits a tokenCount event if the source completes without emitting one', async () => {
    manuallyCountPromptTokensMock.mockReturnValue(5);
    manuallyCountCompletionTokensMock.mockReturnValue(10);

    const events = [chunkEvent('chunk-1'), chunkEvent('chunk-2'), chunkEvent('chunk-3')];

    const result$ = of(...events).pipe(emitTokenCountEstimateIfMissing({ request: stubRequest() }));
    const output = await lastValueFrom(result$.pipe(toArray()));

    expect(manuallyCountPromptTokensMock).toHaveBeenCalledTimes(1);
    expect(manuallyCountCompletionTokensMock).toHaveBeenCalledTimes(1);

    expect(output).toEqual([...events, tokensEvent({ prompt: 5, completion: 10, total: 15 })]);
  });
});
