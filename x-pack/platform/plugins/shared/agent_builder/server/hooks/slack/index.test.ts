/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  ConversationOriginType,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import {
  HookExecutionMode,
  HookLifecycle,
  type AfterChatEventHookContext,
  type HookHandler,
} from '@kbn/agent-builder-server';
import { loggerMock } from '@kbn/logging-mocks';
import { createRound } from '../../test_utils';
import type { InternalSetupServices } from '../../services';
import { registerSlackHooks } from '.';

const createRoundCompleteEvent = (message: string): RoundCompleteEvent => ({
  type: ChatEventType.roundComplete,
  data: { round: createRound({ response: { message } }) },
});

const createContext = (
  event: RoundCompleteEvent,
  origin?: { type: ConversationOriginType }
): AfterChatEventHookContext => ({
  request: { headers: {} } as AfterChatEventHookContext['request'],
  execution: {
    executionId: 'execution-1',
    agentParams: { origin },
  } as AfterChatEventHookContext['execution'],
  event,
});

const registerHandler = () => {
  const register = jest.fn();

  registerSlackHooks({ hooks: { register } } as unknown as InternalSetupServices, {
    logger: loggerMock.create(),
  });

  const [[{ id, hooks }]] = register.mock.calls;
  const { mode, handler } = hooks[HookLifecycle.afterChatEvent];

  return { id, mode, handler: handler as HookHandler<HookLifecycle.afterChatEvent> };
};

describe('registerSlackHooks', () => {
  it('registers the Slack bundle with a blocking afterChatEvent hook', () => {
    const { id, mode } = registerHandler();

    expect(id).toBe('slack');
    expect(mode).toBe(HookExecutionMode.blocking);
  });

  it('adds the reply of Slack rounds as Block Kit', async () => {
    const { handler } = registerHandler();
    const event = createRoundCompleteEvent('There are **3** open alerts.');

    const result = await handler(createContext(event, { type: ConversationOriginType.Slack }));

    expect(result).toEqual({
      event: {
        ...event,
        projection: {
          slack: {
            text: expect.any(String),
            blocks: [
              { type: 'section', text: { type: 'mrkdwn', text: 'There are *3* open alerts.' } },
            ],
          },
        },
      },
    });
  });

  it('leaves events of rounds without an origin unchanged', async () => {
    const { handler } = registerHandler();

    expect(await handler(createContext(createRoundCompleteEvent('Hello')))).toBeUndefined();
  });
});
