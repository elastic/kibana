/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, toArray, firstValueFrom } from 'rxjs';
import type { ChatCompletionEvent } from '@kbn/inference-common';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { chunkEvent, tokensEvent, messageEvent } from '../test_utils';
import { handleTokenUsageLogging } from './handle_token_usage_logging';
import type { TokenUsageLogger } from './token_usage_logger';
import type { TokenUsageContext } from './types';

describe('handleTokenUsageLogging', () => {
  let tokenUsageLogger: jest.Mocked<TokenUsageLogger>;
  let logger: MockedLogger;
  let context: TokenUsageContext;
  let getContext: () => TokenUsageContext;

  beforeEach(() => {
    tokenUsageLogger = {
      log: jest.fn().mockResolvedValue(undefined),
      setEsClient: jest.fn(),
    } as unknown as jest.Mocked<TokenUsageLogger>;

    logger = loggerMock.create();

    context = {
      connectorId: 'test-connector',
      featureId: 'test-feature',
      parentFeatureId: 'test-parent',
      modelId: 'gpt-4',
      modelCreator: 'OpenAI',
      provider: 'Elastic',
    };

    getContext = () => context;
  });

  it('should pass through all events without modification', async () => {
    const source$ = new Subject<ChatCompletionEvent>();
    const result$ = source$.pipe(
      handleTokenUsageLogging({ tokenUsageLogger, getContext, logger }),
      toArray()
    );

    const resultPromise = firstValueFrom(result$);

    const chunk = chunkEvent('hello');
    const tokens = tokensEvent({ prompt: 10, completion: 20, total: 30 });
    const message = messageEvent('hello world');

    source$.next(chunk);
    source$.next(tokens);
    source$.next(message);
    source$.complete();

    const events = await resultPromise;
    expect(events).toEqual([chunk, tokens, message]);
  });

  it('should log token usage on completion when token count is available', async () => {
    const source$ = new Subject<ChatCompletionEvent>();
    const result$ = source$.pipe(
      handleTokenUsageLogging({ tokenUsageLogger, getContext, logger }),
      toArray()
    );

    const resultPromise = firstValueFrom(result$);

    source$.next(chunkEvent('hello'));
    source$.next(tokensEvent({ prompt: 10, completion: 20, total: 30 }, { model: 'gpt-4-turbo' }));
    source$.next(messageEvent('hello world'));
    source$.complete();

    await resultPromise;

    expect(tokenUsageLogger.log).toHaveBeenCalledWith({
      tokens: { prompt: 10, completion: 20, total: 30 },
      model: 'gpt-4-turbo',
      context,
    });
  });

  it('should not log when no token count event is emitted', async () => {
    const source$ = new Subject<ChatCompletionEvent>();
    const result$ = source$.pipe(
      handleTokenUsageLogging({ tokenUsageLogger, getContext, logger }),
      toArray()
    );

    const resultPromise = firstValueFrom(result$);

    source$.next(chunkEvent('hello'));
    source$.next(messageEvent('hello world'));
    source$.complete();

    await resultPromise;

    expect(tokenUsageLogger.log).not.toHaveBeenCalled();
  });

  it('should not log on error', async () => {
    const source$ = new Subject<ChatCompletionEvent>();
    const result$ = source$.pipe(
      handleTokenUsageLogging({ tokenUsageLogger, getContext, logger }),
      toArray()
    );

    const resultPromise = firstValueFrom(result$).catch(() => {});

    source$.next(tokensEvent({ prompt: 10, completion: 20, total: 30 }));
    source$.error(new Error('something failed'));

    await resultPromise;

    expect(tokenUsageLogger.log).not.toHaveBeenCalled();
  });

  it('should not fail the stream if token usage logging fails', async () => {
    tokenUsageLogger.log.mockRejectedValue(new Error('logging failed'));

    const source$ = new Subject<ChatCompletionEvent>();
    const result$ = source$.pipe(
      handleTokenUsageLogging({ tokenUsageLogger, getContext, logger }),
      toArray()
    );

    const resultPromise = firstValueFrom(result$);

    source$.next(tokensEvent({ prompt: 10, completion: 20, total: 30 }));
    source$.next(messageEvent('done'));
    source$.complete();

    const events = await resultPromise;
    expect(events).toHaveLength(2);
  });

  it('should log an error when token usage logging fails unexpectedly', async () => {
    tokenUsageLogger.log.mockRejectedValue(new Error('logging failed'));

    const source$ = new Subject<ChatCompletionEvent>();
    const result$ = source$.pipe(
      handleTokenUsageLogging({ tokenUsageLogger, getContext, logger }),
      toArray()
    );

    const resultPromise = firstValueFrom(result$);

    source$.next(tokensEvent({ prompt: 10, completion: 20, total: 30 }));
    source$.next(messageEvent('done'));
    source$.complete();

    await resultPromise;
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected error in token usage logging: logging failed'
    );
  });
});
