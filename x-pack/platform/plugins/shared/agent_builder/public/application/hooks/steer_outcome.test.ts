/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentBuilderErrorCode, TimelineEventType } from '@kbn/agent-builder-common';
import { isConversationBusyRejection, requestSteer, steerErrorOutcome } from './steer_outcome';

jest.mock('@kbn/agent-builder-browser', () => ({
  formatAgentBuilderErrorMessage: (error: Error) => error.message,
}));

const httpError = ({
  status,
  message = 'Refused',
  code,
}: {
  status: number;
  message?: string;
  code?: AgentBuilderErrorCode;
}) =>
  Object.assign(new Error(message), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
    body: { statusCode: status, message, ...(code ? { attributes: { code } } : {}) },
  });

const request = { conversationId: 'conv-1', message: 'hello', eventId: 'steer-1' };
const event = {
  id: 'steer-1',
  type: TimelineEventType.userMessage,
  created_at: '2026-11-12T10:00:00.000Z',
  actor: { type: 'user' as const, id: 'user-1' },
  data: { message: 'hello', steer: { execution_id: 'exec-1' } },
};

describe('requestSteer', () => {
  it('returns the stored event the server answered with', async () => {
    const steer = jest.fn().mockResolvedValue({ event });

    await expect(requestSteer({ steer }, request)).resolves.toEqual({ kind: 'stored', event });
    expect(steer).toHaveBeenCalledWith(request);
  });

  it('classifies a failed request', async () => {
    const steer = jest
      .fn()
      .mockRejectedValue(httpError({ status: 409, code: AgentBuilderErrorCode.noActiveExecution }));

    await expect(requestSteer({ steer }, request)).resolves.toEqual({ kind: 'converse' });
  });
});

describe('steerErrorOutcome', () => {
  it('lets the message start a run when no run holds the conversation', () => {
    expect(
      steerErrorOutcome(httpError({ status: 409, code: AgentBuilderErrorCode.noActiveExecution }))
    ).toEqual({ kind: 'converse' });
  });

  it.each([
    [AgentBuilderErrorCode.conversationAwaitingPrompt, 409, /waiting for your answer/],
    [AgentBuilderErrorCode.conversationNotSteerable, 409, /public conversation/],
    [AgentBuilderErrorCode.tooManyPendingSteers, 429, /unread messages/],
  ] as const)('explains a %s refusal', (code, status, title) => {
    expect(steerErrorOutcome(httpError({ status, code }))).toEqual({
      kind: 'refused',
      title: expect.stringMatching(title),
    });
  });

  it('shows the server message for a 4xx without a steer code', () => {
    expect(
      steerErrorOutcome(httpError({ status: 404, message: 'Conversation not found' }))
    ).toEqual({ kind: 'refused', title: 'Conversation not found' });
  });

  it('treats a network failure or a 5xx as unanswered', () => {
    expect(steerErrorOutcome(new Error('Failed to fetch'))).toEqual({ kind: 'unanswered' });
    expect(steerErrorOutcome(httpError({ status: 502 }))).toEqual({ kind: 'unanswered' });
  });
});

describe('isConversationBusyRejection', () => {
  it('recognises the busy refusal of an ordinary send and nothing else', () => {
    expect(
      isConversationBusyRejection(
        httpError({ status: 409, code: AgentBuilderErrorCode.conversationBusy })
      )
    ).toBe(true);
    expect(isConversationBusyRejection(httpError({ status: 403 }))).toBe(false);
    expect(isConversationBusyRejection(new Error('Failed to fetch'))).toBe(false);
  });
});
