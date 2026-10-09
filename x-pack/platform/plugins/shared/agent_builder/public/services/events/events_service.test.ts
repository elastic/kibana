/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_STATE_CHANGED_UI_EVENT,
  ChatEventType,
  TODOS_UPDATED_UI_EVENT,
  type ApiStateChangedEventData,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import { EventsService } from './events_service';

const messageChunkEvent = (chunk: string): ChatEvent =>
  ({
    type: ChatEventType.messageChunk,
    data: { message_id: 'm1', text_chunk: chunk },
  } as ChatEvent);

const toolUiEvent = (customEvent: string, data: object): ChatEvent => ({
  type: ChatEventType.toolUi,
  data: {
    tool_id: 'execute_api',
    tool_call_id: 'call-1',
    custom_event: customEvent,
    data,
  },
});

const createAgentChange: ApiStateChangedEventData = {
  target: 'kibana',
  api: 'agent-builder.post-agent-builder-agents',
  method: 'POST',
  path: '/api/agent_builder/agents',
};

const createIndexChange: ApiStateChangedEventData = {
  target: 'elasticsearch',
  api: 'indices.create',
  method: 'PUT',
  path: '/my-index',
};

const apiStateChangedEvent = (change: ApiStateChangedEventData): ChatEvent =>
  toolUiEvent(API_STATE_CHANGED_UI_EVENT, change);

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

  describe('getApiStateChanges$', () => {
    const agentApis = [{ target: 'kibana' as const, api: 'agent-builder.*' }];

    it('emits the matching operations reported in the active conversation', () => {
      const service = new EventsService();
      const received: ApiStateChangedEventData[] = [];
      service.getApiStateChanges$({ apis: agentApis }).subscribe((change) => received.push(change));

      service.setActiveConversation({ id: 'A' });
      service.propagateChatEvent('A', apiStateChangedEvent(createAgentChange));

      expect(received).toEqual([createAgentChange]);
    });

    it('ignores operations no selector covers, including ones on the other target', () => {
      const service = new EventsService();
      const received: ApiStateChangedEventData[] = [];
      service
        .getApiStateChanges$({ apis: [{ target: 'kibana', api: '*' }] })
        .subscribe((change) => received.push(change));

      service.setActiveConversation({ id: 'A' });
      service.propagateChatEvent('A', apiStateChangedEvent(createIndexChange));

      expect(received).toEqual([]);
    });

    it('ignores other tool UI events and other chat events', () => {
      const service = new EventsService();
      const received: ApiStateChangedEventData[] = [];
      service.getApiStateChanges$({ apis: agentApis }).subscribe((change) => received.push(change));

      service.setActiveConversation({ id: 'A' });
      service.propagateChatEvent('A', toolUiEvent(TODOS_UPDATED_UI_EVENT, createAgentChange));
      service.propagateChatEvent('A', messageChunkEvent('chunk'));

      expect(received).toEqual([]);
    });

    it('ignores conversations other than the active one', () => {
      const service = new EventsService();
      const received: ApiStateChangedEventData[] = [];
      service.getApiStateChanges$({ apis: agentApis }).subscribe((change) => received.push(change));

      service.setActiveConversation({ id: 'A' });
      service.propagateChatEvent('B', apiStateChangedEvent(createAgentChange));

      expect(received).toEqual([]);
    });

    it('follows the active conversation when it changes', () => {
      const service = new EventsService();
      const received: ApiStateChangedEventData[] = [];
      service.getApiStateChanges$({ apis: agentApis }).subscribe((change) => received.push(change));

      service.setActiveConversation({ id: 'A' });
      service.setActiveConversation({ id: 'B' });
      service.propagateChatEvent('A', apiStateChangedEvent(createAgentChange));
      service.propagateChatEvent('B', apiStateChangedEvent(createAgentChange));

      expect(received).toEqual([createAgentChange]);
    });

    it('emits nothing while no conversation is active', () => {
      const service = new EventsService();
      const received: ApiStateChangedEventData[] = [];
      service.getApiStateChanges$({ apis: agentApis }).subscribe((change) => received.push(change));

      service.setActiveConversation({ id: 'A' });
      service.clearActiveConversation();
      service.propagateChatEvent('A', apiStateChangedEvent(createAgentChange));

      expect(received).toEqual([]);
    });

    it('stops emitting once unsubscribed', () => {
      const service = new EventsService();
      const received: ApiStateChangedEventData[] = [];
      const subscription = service
        .getApiStateChanges$({ apis: agentApis })
        .subscribe((change) => received.push(change));

      service.setActiveConversation({ id: 'A' });
      subscription.unsubscribe();
      service.propagateChatEvent('A', apiStateChangedEvent(createAgentChange));

      expect(received).toEqual([]);
    });
  });

  describe('getStreamEnded$', () => {
    it('only fires for the matching conversation id', () => {
      const service = new EventsService();
      let endedA = 0;
      let endedB = 0;

      service.getStreamEnded$('A').subscribe(() => endedA++);
      service.getStreamEnded$('B').subscribe(() => endedB++);

      service.notifyStreamEnded('A');

      expect(endedA).toBe(1);
      expect(endedB).toBe(0);
    });

    it('does not replay a run that ended before subscribing', () => {
      const service = new EventsService();
      service.notifyStreamEnded('A');

      let ended = 0;
      service.getStreamEnded$('A').subscribe(() => ended++);

      expect(ended).toBe(0);
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
