/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatEventType, type ChatEvent } from '@kbn/agent-builder-common';
import { EventsService } from './events_service';

const messageChunkEvent = (chunk: string): ChatEvent =>
  ({
    type: ChatEventType.messageChunk,
    data: { message_id: 'm1', text_chunk: chunk },
  } as ChatEvent);

describe('EventsService', () => {
  describe('getChatEvents$', () => {
    it('only emits events tagged with the matching conversation id', () => {
      const service = new EventsService();
      const fromA: ChatEvent[] = [];
      const fromB: ChatEvent[] = [];

      service.getChatEvents$('A').subscribe((event) => fromA.push(event));
      service.getChatEvents$('B').subscribe((event) => fromB.push(event));

      service.propagateChatEvent('A', messageChunkEvent('a1'));
      service.propagateChatEvent('B', messageChunkEvent('b1'));
      service.propagateChatEvent('A', messageChunkEvent('a2'));

      expect(fromA.map((e) => (e.data as any).text_chunk)).toEqual(['a1', 'a2']);
      expect(fromB.map((e) => (e.data as any).text_chunk)).toEqual(['b1']);
    });

    it('returns a hot stream — events emitted before subscription are not replayed', () => {
      const service = new EventsService();
      service.propagateChatEvent('A', messageChunkEvent('missed'));

      const received: ChatEvent[] = [];
      service.getChatEvents$('A').subscribe((event) => received.push(event));

      service.propagateChatEvent('A', messageChunkEvent('seen'));

      expect(received.map((e) => (e.data as any).text_chunk)).toEqual(['seen']);
    });
  });

  describe('obs$ (deprecated)', () => {
    it('still emits every event regardless of conversation id', () => {
      const service = new EventsService();
      const received: ChatEvent[] = [];

      service.obs$.subscribe((event) => received.push(event));

      service.propagateChatEvent('A', messageChunkEvent('a'));
      service.propagateChatEvent('B', messageChunkEvent('b'));

      expect(received.map((e) => (e.data as any).text_chunk)).toEqual(['a', 'b']);
    });
  });
});
