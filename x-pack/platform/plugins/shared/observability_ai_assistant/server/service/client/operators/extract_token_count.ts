/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, OperatorFunction, scan, startWith } from 'rxjs';
import {
  StreamingChatResponseEvent,
  StreamingChatResponseEventType,
  TokenCountEvent,
} from '../../../../common/conversation_complete';

export function extractTokenCount(): OperatorFunction<
  StreamingChatResponseEvent,
  TokenCountEvent['tokens']
> {
  return (events$) => {
    return events$.pipe(
      filter(
        (event): event is TokenCountEvent =>
          event.type === StreamingChatResponseEventType.TokenCount
      ),
      scan(
        (acc, event) => {
          acc.completion += event.tokens.completion;
          acc.prompt += event.tokens.prompt;
          acc.total += event.tokens.total;
          return acc;
        },
        { completion: 0, prompt: 0, total: 0 }
      ),
      startWith({ completion: 0, prompt: 0, total: 0 })
    );
  };
}
