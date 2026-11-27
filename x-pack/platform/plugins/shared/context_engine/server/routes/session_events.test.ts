/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { registerSessionEventsRoutes } from './session_events';
import {
  MAX_MEMORY_ID_LENGTH,
  MAX_MEMORY_USER_ID_LENGTH,
  MAX_SESSION_EVENTS_PER_REQUEST,
  MAX_SESSION_EVENT_TEXT_LENGTH,
  SESSION_EVENTS_SAVE_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { SessionMemoryClient } from '../session_memory_client/client';
import { MemoryForbiddenError } from '../session_memory_client/errors';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[]; extendedPrivileges: string[] } };
    options: { availability: unknown; body: { maxBytes: number } };
  };
  handler: RequestHandler;
  validate: { request: { body: Type<Record<string, unknown>> } };
}

const base = { turn_id: 'turn-1', event_at: '2026-11-16T09:58:00.000Z' };
const userEvent = { ...base, id: 'evt-1', type: 'user', content: 'Why is checkout slow?' };
const toolEvent = {
  ...base,
  id: 'evt-2',
  type: 'tool',
  tool_call_id: 'call-1',
  tool_name: 'search_logs',
  status: 'failed',
};

describe('session events routes', () => {
  let route: RegisteredRoute;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let client: jest.Mocked<Pick<SessionMemoryClient, 'saveEvents'>>;
  let getSessionMemoryClient: jest.Mock;

  const validateBody = (body: unknown) => route.validate.request.body.validate(body);

  const callRoute = (body: Record<string, unknown>) =>
    route.handler(
      {} as Parameters<RequestHandler>[0],
      httpServerMock.createKibanaRequest({ body: validateBody(body) }),
      response
    );

  beforeEach(() => {
    response = httpServerMock.createResponseFactory();
    client = {
      saveEvents: jest.fn(async ({ events }) => ({
        results: events.map(({ id }) => ({ id, status: 'created' as const })),
      })),
    };
    getSessionMemoryClient = jest.fn(async () => client);

    const router = {
      versioned: {
        post: jest.fn((config: RegisteredRoute['config']) => ({
          addVersion: (
            versionConfig: { validate: RegisteredRoute['validate'] },
            handler: RequestHandler
          ) => {
            route = { config, handler, validate: versionConfig.validate };
          },
        })),
      },
    } as unknown as IRouter;

    registerSessionEventsRoutes({ router, getSessionMemoryClient });
  });

  it('registers a public experimental route that needs write, declares manage memory and takes 10 MB', () => {
    expect(route.config).toMatchObject({
      path: '/api/context_engine/memory/_save_event',
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
      options: { availability: { stability: 'experimental' } },
    });
    expect(route.config.security.authz.extendedPrivileges).toEqual([apiPrivileges.manageMemory]);
    expect(SESSION_EVENTS_SAVE_PATH).toBe(route.config.path);
    expect(route.config.options.body.maxBytes).toBe(10 * 1024 * 1024);
  });

  it('saves through the client of the request and returns every result in order', async () => {
    client.saveEvents.mockResolvedValueOnce({
      results: [
        { id: 'evt-1', status: 'created' },
        { id: 'evt-2', status: 'failed', error: 'inference failed' },
      ],
    });

    await callRoute({
      session_id: 's1',
      user_id: 'u_other',
      ai_index_ids: ['ops', 'ops'],
      events: [userEvent, toolEvent],
    });

    expect(getSessionMemoryClient).toHaveBeenCalledTimes(1);
    expect(client.saveEvents).toHaveBeenCalledWith({
      sessionId: 's1',
      userId: 'u_other',
      aiIndexIds: ['ops', 'ops'],
      events: [userEvent, toolEvent],
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        results: [
          { id: 'evt-1', status: 'created' },
          { id: 'evt-2', status: 'failed', error: 'inference failed' },
        ],
      },
    });
  });

  it('passes events with their unknown fields unchanged', async () => {
    const events = [
      { ...userEvent, harness: { name: 'claude-code', cwd: '/srv' }, tool_name: 'not-a-tool' },
      { ...toolEvent, result: 'timed out', duration_ms: 30000 },
      { ...toolEvent, id: 'evt-3', status: 'successful', result: [{ hit: 1 }, 'two'] },
      { ...toolEvent, id: 'evt-4', status: null, result: { rows: [], took: 3 } },
      {
        ...base,
        id: 'evt-5',
        type: 'assistant',
        tool_calls: [{ id: 'call-1', name: 'search_logs', args: '{}', type: 'function' }],
      },
      { ...base, id: 'evt-6', type: 'meta', model: 'claude-opus' },
    ];

    await callRoute({ session_id: 's1', events });

    expect(client.saveEvents.mock.calls[0][0].events).toEqual(events);
  });

  it('maps client errors to their responses', async () => {
    client.saveEvents.mockRejectedValueOnce(new MemoryForbiddenError('no profile'));

    await callRoute({ session_id: 's1', events: [userEvent] });

    expect(response.forbidden).toHaveBeenCalledWith({ body: { message: 'no profile' } });
  });

  it('returns 429 when Elasticsearch rejects the request because it is overloaded', async () => {
    client.saveEvents.mockRejectedValueOnce(
      new errors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          statusCode: 429,
          body: {
            error: { type: 'es_rejected_execution_exception', reason: 'too many requests' },
          },
        })
      )
    );

    await callRoute({ session_id: 's1', events: [userEvent] });

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 429,
      body: { message: 'es_rejected_execution_exception: too many requests' },
    });
  });

  it('rethrows other Elasticsearch errors instead of forwarding their status', async () => {
    const esBadRequest = new errors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 400,
        body: { error: { type: 'illegal_argument_exception', reason: 'internal failure' } },
      })
    );
    client.saveEvents.mockRejectedValueOnce(esBadRequest);

    await expect(callRoute({ session_id: 's1', events: [userEvent] })).rejects.toThrow(
      esBadRequest
    );
    expect(response.customError).not.toHaveBeenCalled();
  });

  describe('validation', () => {
    const valid = { session_id: 's1', events: [userEvent, toolEvent] };
    const withEvent = (event: Record<string, unknown>) => ({ session_id: 's1', events: [event] });
    const { turn_id: _turnId, ...withoutTurnId } = userEvent;
    const { tool_name: _toolName, ...withoutToolName } = toolEvent;
    const tooLong = (length: number) => 'x'.repeat(length + 1);

    it('accepts a valid batch', () => {
      expect(() => validateBody(valid)).not.toThrow();
    });

    it.each([
      ['an event without turn_id', withEvent(withoutTurnId)],
      ['a tool event without tool_name', withEvent(withoutToolName)],
      ['a user event without content', withEvent({ ...base, id: 'e', type: 'user' })],
      ['an unknown event type', withEvent({ ...base, id: 'e', type: 'system' })],
      ['an unparseable event_at', withEvent({ ...userEvent, event_at: 'yesterday' })],
      ['a week date', withEvent({ ...userEvent, event_at: '2026-W47-1' })],
      ['an ordinal date', withEvent({ ...userEvent, event_at: '2026-320' })],
      ['a negative seq', withEvent({ ...userEvent, seq: -1 })],
      ['a fractional seq', withEvent({ ...userEvent, seq: 1.5 })],
      ['an unknown status', withEvent({ ...toolEvent, status: 'unknown' })],
      ['a boolean status', withEvent({ ...toolEvent, status: true })],
      ['no events', { session_id: 's1', events: [] }],
      [
        'too many events',
        { session_id: 's1', events: Array(MAX_SESSION_EVENTS_PER_REQUEST + 1).fill(userEvent) },
      ],
      ['an unknown top-level field', { ...valid, transcript: 'old shape' }],
      ['the stored field name ai_index_id', { ...valid, ai_index_id: ['ops'] }],
      ['a missing session_id', { events: [userEvent] }],
      ['a blank session_id', { ...valid, session_id: '   ' }],
      ['a blank user_id', { ...valid, user_id: '  ' }],
      ['a blank ai_index_ids entry', { ...valid, ai_index_ids: [' '] }],
      ['an invalid ai_index_ids entry', { ...valid, ai_index_ids: ['INVALID_UPPER'] }],
      ['a blank event id', withEvent({ ...userEvent, id: ' ' })],
      ['a blank turn_id', withEvent({ ...userEvent, turn_id: '\t' })],
      ['a blank tool_call_id', withEvent({ ...toolEvent, tool_call_id: ' ' })],
      ['a blank tool_name', withEvent({ ...toolEvent, tool_name: ' ' })],
      ['an over-long session_id', { ...valid, session_id: tooLong(MAX_MEMORY_ID_LENGTH) }],
      ['an over-long event id', withEvent({ ...userEvent, id: tooLong(MAX_MEMORY_ID_LENGTH) })],
      ['an over-long user_id', { ...valid, user_id: tooLong(MAX_MEMORY_USER_ID_LENGTH) }],
      [
        'over-long content',
        withEvent({ ...userEvent, content: tooLong(MAX_SESSION_EVENT_TEXT_LENGTH) }),
      ],
    ])('rejects %s', (_name, body) => {
      expect(() => validateBody(body)).toThrow();
    });

    it.each([
      '2026-11-16',
      '2026-11-16T09:58',
      '2026-11-16T09:58:00',
      '2026-11-16T09:58:00.123456789Z',
      '2026-11-16T10:58:00+01:00',
      '2026-11-16T10:58:00+0100',
    ])('accepts event_at %s', (eventAt) => {
      expect(() => validateBody(withEvent({ ...userEvent, event_at: eventAt }))).not.toThrow();
    });

    it('accepts the largest batch', () => {
      expect(() =>
        validateBody({
          session_id: 's1',
          events: Array(MAX_SESSION_EVENTS_PER_REQUEST).fill(userEvent),
        })
      ).not.toThrow();
    });
  });
});
