/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { ChatEventType, type ChatEvent } from '@kbn/agent-builder-common';
import { EventsService } from '../events';
import { propagateEvents } from './propagate_events';

const messageChunkEvent = (chunk: string): ChatEvent =>
  ({
    type: ChatEventType.messageChunk,
    data: { message_id: 'm1', text_chunk: chunk },
  } as ChatEvent);

const setup = () => {
  const eventsService = new EventsService();
  const propagated: Array<[string, ChatEvent]> = [];
  jest
    .spyOn(eventsService, 'propagateChatEvent')
    .mockImplementation((conversationId, event) => propagated.push([conversationId, event]));
  return {
    operator: propagateEvents({ eventsService, conversationId: 'A' }),
    propagated,
  };
};

describe('propagateEvents', () => {
  it('forwards each event tagged with the conversation id', () => {
    const { operator, propagated } = setup();

    of(messageChunkEvent('one'), messageChunkEvent('two')).pipe(operator).subscribe();

    expect(propagated.map(([id, event]) => [id, (event.data as any).text_chunk])).toEqual([
      ['A', 'one'],
      ['A', 'two'],
    ]);
  });
});
