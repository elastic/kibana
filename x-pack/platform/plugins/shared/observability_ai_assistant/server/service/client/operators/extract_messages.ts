/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction } from 'rxjs';
import { filter, last, map, toArray } from 'rxjs';
import type { Message, MessageAddEvent } from '../../../../common';
import { StreamingChatResponseEventType } from '../../../../common';
import type { MessageOrChatEvent } from '../../../../common/conversation_complete';

export function extractMessages(): OperatorFunction<MessageOrChatEvent, Message[]> {
  return (source$) => {
    return source$.pipe(
      filter(
        (event): event is MessageAddEvent =>
          event.type === StreamingChatResponseEventType.MessageAdd
      ),
      map((event) => event.message),
      toArray(),
      last()
    );
  };
}
