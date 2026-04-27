/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction } from 'rxjs';
import { Observable } from 'rxjs';
import type { ChatCompletionEvent, ChatCompletionTokenCount } from '@kbn/inference-common';
import { isChatCompletionTokenCountEvent } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { TokenUsageLogger } from './token_usage_logger';
import type { TokenUsageContext } from './types';

export const handleTokenUsageLogging = ({
  tokenUsageLogger,
  getContext,
  logger,
  isEnabled,
}: {
  tokenUsageLogger: TokenUsageLogger;
  getContext: () => TokenUsageContext;
  logger: Logger;
  isEnabled?: () => Promise<boolean>;
}): OperatorFunction<ChatCompletionEvent, ChatCompletionEvent> => {
  return (source$) => {
    let tokenCount: ChatCompletionTokenCount | undefined;
    let model: string | undefined;

    return new Observable<ChatCompletionEvent>((subscriber) => {
      return source$.subscribe({
        next: (value) => {
          if (isChatCompletionTokenCountEvent(value)) {
            tokenCount = value.tokens;
            if (value.model) {
              model = value.model;
            }
          }
          subscriber.next(value);
        },
        error: (err) => {
          subscriber.error(err);
        },
        complete: () => {
          if (tokenCount) {
            const doLog = async () => {
              if (isEnabled) {
                const enabled = await isEnabled();
                if (!enabled) {
                  return;
                }
              }
              const context = getContext();
              await tokenUsageLogger.log({ tokens: tokenCount!, model, context });
            };
            doLog().catch((err) => {
              logger.error(`Unexpected error in token usage logging: ${err.message}`);
            });
          }
          subscriber.complete();
        },
      });
    });
  };
};
