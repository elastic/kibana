/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { registerSessionEventsRoutes } from './session_events';
import {
  MAX_SESSION_EVENTS_PER_REQUEST,
  MAX_SESSION_EVENT_ID_LENGTH,
  MAX_SESSION_EVENT_TEXT_LENGTH,
  MAX_SESSION_EVENT_USER_ID_LENGTH,
  SESSION_EVENTS_SAVE_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import type { SessionEventsService } from '../session_events/types';

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

const aiIndex = (id: string) => ({ id, dest: { type: 'data_stream', value: `ai-index-ds-${id}` } });

describe('session events routes', () => {
  let route: RegisteredRoute;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let memoryEnabled: boolean;
  let profileUid: string | null;
  let authzResult: Record<string, boolean>;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let aiIndexService: { get: jest.Mock };
  let auditLog: jest.Mock;
  let service: jest.Mocked<SessionEventsService>;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        security: { audit: { logger: { log: auditLog } } },
        userProfile: { getCurrentProfileId: async () => profileUid },
        elasticsearch: { client: { asCurrentUser: esClient } },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const validateBody = (body: unknown) => route.validate.request.body.validate(body);

  const callRoute = (body: Record<string, unknown>) =>
    route.handler(
      createContext(),
      Object.assign(httpServerMock.createKibanaRequest({ body: validateBody(body) }), {
        authzResult,
      }),
      response
    );

  const savedScope = () => service.saveEvents.mock.calls[0][0];
  const savedInput = () => service.saveEvents.mock.calls[0][1];
  const auditedEvents = () => auditLog.mock.calls.map(([event]) => event);

  const writableIndices = (writable: Record<string, boolean>) =>
    esClient.security.hasPrivileges.mockResolvedValueOnce({
      index: Object.fromEntries(Object.entries(writable).map(([name, write]) => [name, { write }])),
    } as never);

  beforeEach(() => {
    featureFlagEnabled = true;
    memoryEnabled = true;
    profileUid = 'u_jdoe_profile';
    authzResult = { [apiPrivileges.manageMemory]: true };
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    aiIndexService = { get: jest.fn(async (id: string) => aiIndex(id)) };
    auditLog = jest.fn();
    response = httpServerMock.createResponseFactory();
    service = {
      saveEvents: jest.fn(async (_scope, { events }) => ({
        results: events.map(({ id }) => ({ id, status: 'created' as const })),
      })),
    };

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

    registerSessionEventsRoutes({
      router,
      getSpaces: async () =>
        ({ spacesService: { getSpaceId: () => 'marketing' } } as unknown as SpacesPluginStart),
      getSessionEventsService: async () => service,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      isMemoryEnabled: async () => memoryEnabled,
    });
  });

  it('registers a public experimental route that needs write, checks manage memory and takes 10 MB', () => {
    expect(route.config).toMatchObject({
      path: '/api/context_engine/memory/_save_event',
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.writeContextEngine],
          extendedPrivileges: [apiPrivileges.manageMemory],
        },
      },
      options: { availability: { stability: 'experimental' } },
    });
    expect(SESSION_EVENTS_SAVE_PATH).toBe(route.config.path);
    expect(route.config.options.body.maxBytes).toBe(10 * 1024 * 1024);
  });

  it('returns 404 and saves nothing when the context engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute({ session_id: 's1', events: [userEvent] });

    expect(response.notFound).toHaveBeenCalledTimes(1);
    expect(service.saveEvents).not.toHaveBeenCalled();
  });

  it('returns 404 and saves nothing when memory is turned off', async () => {
    memoryEnabled = false;

    await callRoute({ session_id: 's1', events: [userEvent] });

    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: 'Context Engine memory is turned off.' },
    });
    expect(service.saveEvents).not.toHaveBeenCalled();
  });

  it('saves the events for the caller in the request space and returns every result in order', async () => {
    writableIndices({ 'ai-index-ds-ops-memory': true });
    service.saveEvents.mockResolvedValueOnce({
      results: [
        { id: 'evt-1', status: 'created' },
        { id: 'evt-2', status: 'failed', error: 'inference failed' },
        { id: 'evt-3', status: 'created' },
      ],
    });

    await callRoute({
      session_id: 's1',
      ai_index_ids: ['ops-memory'],
      events: [userEvent, toolEvent, { ...base, id: 'evt-3', type: 'assistant', content: 'Done.' }],
    });

    expect(savedScope()).toEqual({ space: 'marketing', userId: 'u_jdoe_profile' });
    expect(savedInput()).toMatchObject({ sessionId: 's1', aiIndexIds: ['ops-memory'] });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        results: [
          { id: 'evt-1', status: 'created' },
          { id: 'evt-2', status: 'failed', error: 'inference failed' },
          { id: 'evt-3', status: 'created' },
        ],
      },
    });
  });

  it('passes events to the service with their unknown fields unchanged', async () => {
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
      {
        ...base,
        id: 'evt-7',
        type: 'assistant',
        tool_calls: [
          { id: 'toolu_01', name: 'Read', args: { file_path: '/srv/app.ts', limit: 40 } },
          { id: 'toolu_02', name: 'Bash', args: ['ls', '-la'] },
        ],
      },
    ];

    await callRoute({ session_id: 's1', events });

    expect(savedInput().events).toEqual(events);
  });

  describe('user_id', () => {
    it("is the caller's id when it is left out, without manage memory", async () => {
      authzResult = { [apiPrivileges.manageMemory]: false };

      await callRoute({ session_id: 's1', events: [userEvent] });

      expect(savedScope()).toEqual({ space: 'marketing', userId: 'u_jdoe_profile' });
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it('files the events under another user when user_id names one, with manage memory', async () => {
      await callRoute({ session_id: 's1', user_id: 'u_other', events: [userEvent] });

      expect(savedScope()).toEqual({ space: 'marketing', userId: 'u_other' });
      expect(response.forbidden).not.toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it('returns 403 and saves nothing for a caller without a profile and without user_id', async () => {
      profileUid = null;

      await callRoute({ session_id: 's1', events: [userEvent] });

      expect(response.forbidden).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('The caller has no user profile') },
      });
      expect(service.saveEvents).not.toHaveBeenCalled();
    });

    it('returns 403, audits and saves nothing when user_id names another user without manage memory', async () => {
      authzResult = { [apiPrivileges.manageMemory]: false };

      await callRoute({ session_id: 's1', user_id: 'u_other', events: [userEvent] });

      expect(response.forbidden).toHaveBeenCalledWith({
        body: { message: expect.stringContaining(apiPrivileges.manageMemory) },
      });
      expect(service.saveEvents).not.toHaveBeenCalled();
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          event: expect.objectContaining({ action: 'memory_save_event', outcome: 'failure' }),
          user: { target: { id: 'u_other' } },
        }),
      ]);
    });

    it('accepts the caller naming itself in user_id without manage memory', async () => {
      authzResult = { [apiPrivileges.manageMemory]: false };

      await callRoute({ session_id: 's1', user_id: 'u_jdoe_profile', events: [userEvent] });

      expect(savedScope()).toEqual({ space: 'marketing', userId: 'u_jdoe_profile' });
      expect(response.forbidden).not.toHaveBeenCalled();
    });

    it('saves for the named user when the caller has no profile, with manage memory', async () => {
      profileUid = null;

      await callRoute({ session_id: 's1', user_id: 'u_someone', events: [userEvent] });

      expect(savedScope()).toEqual({ space: 'marketing', userId: 'u_someone' });
      expect(response.forbidden).not.toHaveBeenCalled();
    });
  });

  describe('ai_index_ids', () => {
    it("checks the caller's write privilege on each AI index's backing index once", async () => {
      writableIndices({ 'ai-index-ds-ops': true, 'ai-index-ds-sales': true });

      await callRoute({
        session_id: 's1',
        ai_index_ids: ['ops', 'sales', 'ops'],
        events: [userEvent],
      });

      expect(aiIndexService.get.mock.calls).toEqual([
        ['ops', 'marketing'],
        ['sales', 'marketing'],
      ]);
      expect(esClient.security.hasPrivileges).toHaveBeenCalledWith({
        index: [{ names: ['ai-index-ds-ops', 'ai-index-ds-sales'], privileges: ['write'] }],
      });
      expect(service.saveEvents).toHaveBeenCalledTimes(1);
    });

    it('returns 403 and saves nothing when one AI index is not writable', async () => {
      writableIndices({ 'ai-index-ds-ops': true, 'ai-index-ds-sales': false });

      await callRoute({ session_id: 's1', ai_index_ids: ['ops', 'sales'], events: [userEvent] });

      expect(response.forbidden).toHaveBeenCalledWith({
        body: { message: expect.stringContaining("AI index 'sales' is not writable") },
      });
      expect(service.saveEvents).not.toHaveBeenCalled();
    });

    it('returns 404 and saves nothing when an AI index does not exist', async () => {
      aiIndexService.get.mockRejectedValueOnce(new AiIndexNotFoundError('missing'));

      await callRoute({ session_id: 's1', ai_index_ids: ['missing'], events: [userEvent] });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: expect.stringContaining("'missing' not found") },
      });
      expect(service.saveEvents).not.toHaveBeenCalled();
    });

    it('checks nothing when the request names no AI index', async () => {
      await callRoute({ session_id: 's1', events: [userEvent] });

      expect(aiIndexService.get).not.toHaveBeenCalled();
      expect(esClient.security.hasPrivileges).not.toHaveBeenCalled();
      expect(savedInput()).toMatchObject({ aiIndexIds: [] });
    });
  });

  describe('audit', () => {
    it('writes one event per request with the target user and the counts', async () => {
      service.saveEvents.mockResolvedValueOnce({
        results: [
          { id: 'evt-1', status: 'created' },
          { id: 'evt-2', status: 'failed', error: 'inference failed' },
        ],
      });

      await callRoute({ session_id: 's1', events: [userEvent, toolEvent] });

      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          message: 'User has saved 1 event(s) of session [id=s1], 1 failed',
          event: expect.objectContaining({ action: 'memory_save_event', outcome: 'success' }),
          user: { target: { id: 'u_jdoe_profile' } },
          kibana: { saved_object: { type: 'session_events', id: 's1' } },
        }),
      ]);
    });

    it('records the named user as the target of the events', async () => {
      await callRoute({ session_id: 's1', user_id: 'u_other', events: [userEvent] });

      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          event: expect.objectContaining({ action: 'memory_save_event', outcome: 'success' }),
          user: { target: { id: 'u_other' } },
        }),
      ]);
    });

    it('records a rejected request as a failure', async () => {
      profileUid = null;

      await callRoute({ session_id: 's1', events: [userEvent] });

      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          event: expect.objectContaining({ action: 'memory_save_event', outcome: 'failure' }),
          error: expect.objectContaining({ code: 'Forbidden' }),
        }),
      ]);
    });

    it('records a failed write and rethrows it', async () => {
      service.saveEvents.mockRejectedValueOnce(new Error('cluster unavailable'));

      await expect(callRoute({ session_id: 's1', events: [userEvent] })).rejects.toThrow(
        'cluster unavailable'
      );
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          event: expect.objectContaining({ outcome: 'failure' }),
          error: { code: 'Error', message: 'cluster unavailable' },
        }),
      ]);
    });

    it('writes nothing while Context Engine or memory is turned off', async () => {
      memoryEnabled = false;

      await callRoute({ session_id: 's1', events: [userEvent] });

      expect(auditLog).not.toHaveBeenCalled();
    });
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
      ['an over-long session_id', { ...valid, session_id: tooLong(MAX_SESSION_EVENT_ID_LENGTH) }],
      [
        'an over-long event id',
        withEvent({ ...userEvent, id: tooLong(MAX_SESSION_EVENT_ID_LENGTH) }),
      ],
      ['an over-long user_id', { ...valid, user_id: tooLong(MAX_SESSION_EVENT_USER_ID_LENGTH) }],
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
