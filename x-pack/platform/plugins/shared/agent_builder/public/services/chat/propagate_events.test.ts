/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, of, throwError } from 'rxjs';
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
  const runsEnded: string[] = [];
  jest
    .spyOn(eventsService, 'propagateChatEvent')
    .mockImplementation((conversationId, event) => propagated.push([conversationId, event]));
  jest
    .spyOn(eventsService, 'notifyRunEnded')
    .mockImplementation((conversationId) => runsEnded.push(conversationId));
  return {
    operator: propagateEvents({ eventsService, conversationId: 'A' }),
    propagated,
    runsEnded,
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

  // The three ways a run ends. All must report, or the fold keeps an abandoned draft.
  it('reports the run as ended when the stream completes', () => {
    const { operator, runsEnded } = setup();

    of(messageChunkEvent('one')).pipe(operator).subscribe();

    expect(runsEnded).toEqual(['A']);
  });

  it('reports the run as ended when the stream errors', () => {
    const { operator, runsEnded } = setup();

    throwError(() => new Error('boom'))
      .pipe(operator)
      .subscribe({ error: () => {} });

    expect(runsEnded).toEqual(['A']);
  });

  it('reports the run as ended when the caller unsubscribes (abort)', () => {
    const { operator, runsEnded } = setup();
    const source$ = new Subject<ChatEvent>();

    const sub = source$.pipe(operator).subscribe();
    source$.next(messageChunkEvent('partial'));
    expect(runsEnded).toEqual([]);

    sub.unsubscribe();

    expect(runsEnded).toEqual(['A']);
  });
});
