/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  ConversationOriginType,
  type MessageCompleteEvent,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import {
  HookExecutionMode,
  HookLifecycle,
  type AfterChatEventHookContext,
} from '@kbn/agent-builder-server';
import { createRound } from '../../test_utils';
import { addSlackProjection } from './add_slack_projection';
import { registerSlackProjectionHook } from './register_slack_projection_hook';

const createRoundCompleteEvent = (message: string): RoundCompleteEvent => ({
  type: ChatEventType.roundComplete,
  data: { round: createRound({ response: { message } }) },
});

const createExecution = (origin?: { type: ConversationOriginType }) =>
  ({
    executionId: 'execution-1',
    agentParams: { origin },
  } as AfterChatEventHookContext['execution']);

const createContext = (
  overrides: Partial<AfterChatEventHookContext> = {}
): AfterChatEventHookContext => ({
  request: { headers: {} } as AfterChatEventHookContext['request'],
  execution: createExecution({ type: ConversationOriginType.Slack }),
  event: createRoundCompleteEvent('Hello'),
  ...overrides,
});

describe('addSlackProjection', () => {
  it('adds the reply as is as a Slack markdown payload', () => {
    const message = 'Here is the chart:\n\n<render_attachment id="a1" version="1" />';
    const event = createRoundCompleteEvent(message);

    expect(addSlackProjection(createContext({ event }))).toEqual({
      event: {
        ...event,
        projection: { slack: { text: message, blocks: [{ type: 'markdown', text: message }] } },
      },
    });
  });

  it('does not mutate the original event', () => {
    const event = createRoundCompleteEvent('Hello');

    addSlackProjection(createContext({ event }));

    expect(event).not.toHaveProperty('projection');
  });

  it('returns nothing for rounds without a Slack origin', () => {
    expect(addSlackProjection(createContext({ execution: createExecution() }))).toBeUndefined();
  });

  it('returns nothing when the reply is empty', () => {
    expect(
      addSlackProjection(createContext({ event: createRoundCompleteEvent('') }))
    ).toBeUndefined();
  });

  it('returns nothing for events other than round_complete', () => {
    const event: MessageCompleteEvent = {
      type: ChatEventType.messageComplete,
      data: { message_id: 'message-1', message_content: 'Hello' },
    };

    expect(addSlackProjection(createContext({ event }))).toBeUndefined();
  });
});

describe('registerSlackProjectionHook', () => {
  it('registers a blocking afterChatEvent hook', () => {
    const register = jest.fn();

    registerSlackProjectionHook({ hooks: { register } } as never);

    expect(register).toHaveBeenCalledWith({
      id: 'slack-projection',
      hooks: {
        [HookLifecycle.afterChatEvent]: {
          mode: HookExecutionMode.blocking,
          handler: addSlackProjection,
        },
      },
    });
  });
});
