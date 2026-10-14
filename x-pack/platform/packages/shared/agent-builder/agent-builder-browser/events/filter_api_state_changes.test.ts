/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import {
  API_STATE_CHANGED_UI_EVENT,
  ChatEventType,
  TODOS_UPDATED_UI_EVENT,
  type ApiStateChangedEventData,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import type { ApiStateChangesOptions } from './filter_api_state_changes';
import { filterApiStateChanges } from './filter_api_state_changes';

const toolUiEvent = (customEvent: string, data: object): ChatEvent => ({
  type: ChatEventType.toolUi,
  data: {
    tool_id: 'execute_api',
    tool_call_id: 'call-1',
    custom_event: customEvent,
    data,
  },
});

const apiStateChangedEvent = (change: ApiStateChangedEventData): ChatEvent =>
  toolUiEvent(API_STATE_CHANGED_UI_EVENT, change);

const messageChunkEvent: ChatEvent = {
  type: ChatEventType.messageChunk,
  data: { message_id: 'm1', text_chunk: 'chunk' },
};

const createAgentChange: ApiStateChangedEventData = {
  target: 'kibana',
  api: 'agent-builder.post-agent-builder-agents',
  method: 'POST',
  path: '/api/agent_builder/agents',
};

const createCaseChange: ApiStateChangedEventData = {
  target: 'kibana',
  api: 'cases.create-case',
  method: 'POST',
  path: '/api/cases',
};

const createIndexChange: ApiStateChangedEventData = {
  target: 'elasticsearch',
  api: 'indices.create',
  method: 'PUT',
  path: '/my-index',
};

const collect = (options: ApiStateChangesOptions, events: ChatEvent[]) => {
  const events$ = new Subject<ChatEvent>();
  const received: ApiStateChangedEventData[] = [];
  events$.pipe(filterApiStateChanges(options)).subscribe((change) => received.push(change));
  events.forEach((event) => events$.next(event));
  return received;
};

describe('filterApiStateChanges', () => {
  it('emits the payload of the operations a selector covers', () => {
    const received = collect({ apis: [{ target: 'kibana', api: 'agent-builder.*' }] }, [
      apiStateChangedEvent(createAgentChange),
      apiStateChangedEvent(createCaseChange),
    ]);

    expect(received).toEqual([createAgentChange]);
  });

  it('only matches operations on the target of the selector', () => {
    const received = collect({ apis: [{ target: 'kibana', api: '*' }] }, [
      apiStateChangedEvent(createIndexChange),
      apiStateChangedEvent(createCaseChange),
    ]);

    expect(received).toEqual([createCaseChange]);
  });

  it('ignores other tool UI events and other chat events', () => {
    const received = collect({ apis: [{ target: 'kibana', api: '*' }] }, [
      toolUiEvent(TODOS_UPDATED_UI_EVENT, createAgentChange),
      messageChunkEvent,
    ]);

    expect(received).toEqual([]);
  });

  it('emits nothing for an empty selector list', () => {
    const received = collect({ apis: [] }, [apiStateChangedEvent(createAgentChange)]);

    expect(received).toEqual([]);
  });
});
