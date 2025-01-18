/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, OperatorFunction } from 'rxjs';
import {
  StreamingChatResponseEvent,
  StreamingChatResponseEventType,
  TokenCountEvent,
} from '../conversation_complete';

export function withoutTokenCountEvents<T extends StreamingChatResponseEvent>(): OperatorFunction<
  T,
  Exclude<T, TokenCountEvent>
> {
  return filter(
    (event): event is Exclude<T, TokenCountEvent> =>
      event.type !== StreamingChatResponseEventType.TokenCount
  );
}
