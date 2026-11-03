/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { CoreSetup, IRouter, KibanaRequest, RequestHandler } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  EventActorType,
  TimelineEventType,
  type ConversationEvent,
  type ConversationRound,
} from '@kbn/agent-builder-common';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import type { ConversationDocument } from '../lib/conversation_storage';
import { eventsFromRounds, roundsFromEvents, serializeConversationRounds } from '../lib/timeline';
import { registerConversationRoutes } from './conversations';

const ctx = { agentId: 'agent-1', username: 'elastic', userId: 'user-1' };

const createRound = (overrides: Partial<ConversationRound> = {}): ConversationRound => ({
  id: 'round-1',
  status: ConversationRoundStatus.completed,
  input: { message: 'hello' },
  steps: [
    {
      type: ConversationRoundStepType.toolCall,
      tool_call_id: 'call-1',
      tool_id: 'my_tool',
      params: {},
      results: [{ tool_result_id: 'r1', type: 'other', data: { foo: 'bar' } }],
    } as unknown as ConversationRound['steps'][number],
  ],
  response: { message: 'hi there' },
  started_at: '2025-01-01T00:00:00.000Z',
  time_to_first_token: 100,
  time_to_last_token: 500,
  model_usage: { connector_id: 'c1', llm_calls: 1, input_tokens: 10, output_tokens: 5 },
  ...overrides,
});

const baseDocument = (overrides: Partial<ConversationDocument> = {}): ConversationDocument => ({
  agent_id: 'agent-1',
  user_id: 'user-1',
  user_name: 'elastic',
  space: 'default',
  title: 'A conversation',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  conversation_rounds: [],
  ...overrides,
});

const setup = (storedDocument?: ConversationDocument) => {
  const esClient = {
    indices: { existsAlias: jest.fn().mockResolvedValue(true) },
    search: jest.fn().mockResolvedValue({
      hits: { hits: storedDocument ? [{ _id: 'conv-1', _source: storedDocument }] : [] },
    }),
    index: jest.fn().mockResolvedValue({}),
  };
  const coreStart = {
    featureFlags: { getBooleanValue$: jest.fn().mockReturnValue(of(true)) },
    savedObjects: { getScopedClient: jest.fn() },
    uiSettings: { asScopedToClient: jest.fn().mockReturnValue({ get: async () => true }) },
    elasticsearch: { client: { asScoped: () => ({ asInternalUser: esClient }) } },
    http: { basePath: { get: () => '' } },
    security: {
      authc: {
        getCurrentUser: () => ({ username: 'elastic', profile_uid: 'user-1' }),
      },
    },
  };
  const coreSetup = {
    getStartServices: async () => [coreStart, {}, {}],
  } as unknown as CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;

  const handlers: Record<string, RequestHandler> = {};
  const register =
    (method: string) =>
    ({ path }: { path: string }, handler: RequestHandler) => {
      handlers[`${method} ${path}`] = handler;
    };
  const router = {
    get: register('GET'),
    post: register('POST'),
    put: register('PUT'),
  } as unknown as IRouter;

  registerConversationRoutes({
    router,
    coreSetup,
    logger: loggingSystemMock.createLogger(),
  });

  const call = async (
    key: string,
    request: { params?: object; query?: object; body?: object } = {}
  ) => {
    const response = httpServerMock.createResponseFactory();
    await handlers[key](
      {} as never,
      httpServerMock.createKibanaRequest(request) as KibanaRequest,
      response
    );
    return response;
  };

  return { esClient, call };
};

const hitlEvents = (): ConversationEvent[] => {
  const agent = { type: EventActorType.agent, id: 'agent-1' };
  const user = { type: EventActorType.user, id: 'user-1', username: 'elastic' };
  const summary = {
    model_usage: { connector_id: 'c1', llm_calls: 1, input_tokens: 1, output_tokens: 1 },
    time_to_first_token: 1,
    time_to_last_token: 1,
  };
  return [
    {
      id: 'hitl::user_message',
      type: TimelineEventType.userMessage,
      created_at: '2025-01-01T00:00:00.000Z',
      actor: user,
      data: { message: 'do it' },
    },
    {
      id: 'hitl::execution_terminated',
      type: TimelineEventType.executionTerminated,
      created_at: '2025-01-01T00:00:01.000Z',
      actor: agent,
      execution_id: 'hitl::execution',
      trigger_event_id: 'hitl::user_message',
      data: { ...summary, outcome: { type: 'prompt_requested', prompts: [] } },
    },
    {
      id: 'hitl::prompt_response::1',
      type: TimelineEventType.promptResponse,
      created_at: '2025-01-01T00:00:02.000Z',
      actor: user,
      data: { prompt_requested_event_id: 'hitl::execution_terminated', responses: {} },
    },
    {
      id: 'hitl::execution::1::execution_terminated',
      type: TimelineEventType.executionTerminated,
      created_at: '2025-01-01T00:00:03.000Z',
      actor: agent,
      execution_id: 'hitl::execution::1',
      trigger_event_id: 'hitl::prompt_response::1',
      data: { ...summary, outcome: { type: 'responded', response: { message: 'done' } } },
    },
  ] as unknown as ConversationEvent[];
};

describe('conversation routes', () => {
  describe('GET /internal/elastic_ramen/conversations', () => {
    it('excludes both the rounds and the events transcript from list results', async () => {
      const { esClient, call } = setup(baseDocument());
      await call('GET /internal/elastic_ramen/conversations', { query: {} });
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: { excludes: ['conversation_rounds', 'events'] },
        })
      );
    });
  });

  describe('GET /internal/elastic_ramen/conversations/{id}', () => {
    const get = async (document: ConversationDocument) => {
      const { call } = setup(document);
      const response = await call('GET /internal/elastic_ramen/conversations/{id}', {
        params: { id: 'conv-1' },
      });
      return response.ok.mock.calls[0][0]?.body as { conversation_rounds: ConversationRound[] };
    };

    it('folds events for an events-native document, merging a HITL resume into one round', async () => {
      const body = await get(
        baseDocument({
          schema_version: 1,
          conversation_rounds: [],
          events: hitlEvents(),
        })
      );
      expect(body.conversation_rounds).toHaveLength(1);
      expect(body.conversation_rounds[0]).toMatchObject({
        id: 'hitl',
        status: ConversationRoundStatus.completed,
        response: { message: 'done' },
      });
    });

    it('returns the stored rounds of a legacy document, ignoring transitional events', async () => {
      const stored = createRound({ id: 'stored' });
      const body = await get(
        baseDocument({
          conversation_rounds: serializeConversationRounds([stored]),
          events: eventsFromRounds([createRound({ id: 'a' }), createRound({ id: 'b' })], ctx),
        })
      );
      expect(body.conversation_rounds.map((round) => round.id)).toEqual(['stored']);
      expect(body.conversation_rounds[0]).toEqual(stored);
    });
  });

  describe('POST /internal/elastic_ramen/conversations', () => {
    it('stores serialized rounds plus a status-aware events projection', async () => {
      const { esClient, call } = setup();
      const inProgress = createRound({
        id: 'running',
        status: ConversationRoundStatus.inProgress,
        started_at: '2025-01-02T00:00:00.000Z',
      });

      await call('POST /internal/elastic_ramen/conversations', {
        body: { agent_id: 'agent-1', title: 't', conversation_rounds: [createRound(), inProgress] },
      });

      const { document } = esClient.index.mock.calls[0][0];
      expect(document.schema_version).toBe(1);
      expect(typeof document.conversation_rounds[0].steps[0].results).toBe('string');
      const runningEvents = document.events.filter((event: ConversationEvent) =>
        event.id.startsWith('running::')
      );
      expect(runningEvents.map((event: ConversationEvent) => event.type)).toEqual([
        TimelineEventType.userMessage,
        TimelineEventType.executionStarted,
        TimelineEventType.executionStep,
      ]);
    });
  });

  describe('PUT /internal/elastic_ramen/conversations/{id}', () => {
    it('reconciles against an events-native timeline instead of replacing it', async () => {
      const additive: ConversationEvent = {
        id: 'custom-1',
        type: 'custom_note',
        created_at: '2025-01-01T00:00:05.000Z',
        actor: { type: EventActorType.user, id: 'user-1' },
        data: { note: 'keep me' },
      };
      const storedEvents = [...hitlEvents(), additive];
      const { esClient, call } = setup(
        baseDocument({ schema_version: 1, conversation_rounds: [], events: storedEvents })
      );
      const [flatHitl] = roundsFromEvents(storedEvents);
      const added = createRound({ id: 'next', started_at: '2025-01-02T00:00:00.000Z' });

      await call('PUT /internal/elastic_ramen/conversations/{id}', {
        params: { id: 'conv-1' },
        body: { conversation_rounds: [flatHitl, added] },
      });

      const { document } = esClient.index.mock.calls[0][0];
      const ids = document.events.map((event: ConversationEvent) => event.id);
      // The HITL block and the additive event survive, the new round is appended.
      for (const event of storedEvents) {
        expect(ids).toContain(event.id);
      }
      expect(ids).toContain('next::execution_terminated');
      expect(roundsFromEvents(document.events).map((round) => round.id)).toEqual(['hitl', 'next']);
    });

    it('projects a fresh timeline for a legacy document', async () => {
      const round = createRound();
      const { esClient, call } = setup(
        baseDocument({ conversation_rounds: serializeConversationRounds([round]) })
      );

      await call('PUT /internal/elastic_ramen/conversations/{id}', {
        params: { id: 'conv-1' },
        body: { conversation_rounds: [round] },
      });

      const { document } = esClient.index.mock.calls[0][0];
      expect(document.schema_version).toBe(1);
      expect(document.events).toEqual(eventsFromRounds([round], ctx));
    });

    it('leaves events untouched on a title-only update', async () => {
      const storedEvents = hitlEvents();
      const { esClient, call } = setup(baseDocument({ schema_version: 1, events: storedEvents }));

      await call('PUT /internal/elastic_ramen/conversations/{id}', {
        params: { id: 'conv-1' },
        body: { title: 'renamed' },
      });

      const { document } = esClient.index.mock.calls[0][0];
      expect(document.title).toBe('renamed');
      expect(document.events).toEqual(storedEvents);
    });
  });
});
