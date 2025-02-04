/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, Observable, partition } from 'rxjs';
import type { StreamingChatResponseEvent } from '../../../../common';
import {
  StreamingChatResponseEventType,
  TokenCountEvent,
} from '../../../../common/conversation_complete';

type Hide = <T extends StreamingChatResponseEvent>() => (
  source$: Observable<T | TokenCountEvent>
) => Observable<Exclude<T, TokenCountEvent>>;

export function hideTokenCountEvents<T>(
  cb: (hide: Hide) => Observable<Exclude<T, TokenCountEvent>>
): Observable<T | TokenCountEvent> {
  // `hide` can be called multiple times, so we keep track of each invocation
  const allInterceptors: Array<Observable<TokenCountEvent>> = [];

  const hide: Hide = () => (source$) => {
    const [tokenCountEvents$, otherEvents$] = partition(
      source$,
      (value): value is TokenCountEvent => value.type === StreamingChatResponseEventType.TokenCount
    );

    allInterceptors.push(tokenCountEvents$);

    return otherEvents$;
  };

  // combine the two observables again
  return merge(cb(hide), ...allInterceptors);
}
