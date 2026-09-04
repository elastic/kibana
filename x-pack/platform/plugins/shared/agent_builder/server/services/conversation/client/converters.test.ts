/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  CurrentUser,
  ExecutionFailedEvent,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import {
  AgentBuilderErrorCode,
  CONVERSATION_SCHEMA_VERSION,
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  ConversationRoundStatus,
  ConversationOriginType,
  EventActorType,
  MIN_EVENTS_NATIVE_SCHEMA_VERSION,
  TimelineEventType,
  ToolOrigin,
  isEventsNativeVersion,
} from '@kbn/agent-builder-common';
import {
  isToolCallStep,
  ConversationRoundStepType,
  ToolResultType,
} from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { getToolResultId } from '@kbn/agent-builder-server/tools/utils';
import { roundsToEvents } from './rounds_to_events';
import {
  fromEs,
  toEs,
  toConversationResponse,
  toConversationResponseFromDocument,
  createRequestToEs,
  updateConversation,
  type Document as ConversationDocument,
} from './converters';

jest.mock('@kbn/agent-builder-server/tools/utils');

const getToolResultIdMock = getToolResultId as jest.MockedFn<typeof getToolResultId>;

const createTestState = () => ({
  prompt: {
    responses: {
      'tools.my-tool.confirmation': {
        type: AgentPromptType.confirmation as const,
        response: { allow: true },
      },
    },
  },
  dynamic_tool_ids: [
    'security.security_labs_search',
    'platform.core.cases',
    'security.alert-analysis.get-related-alerts',
    'security.alerts',
  ],
});

const requestingUser: CurrentUser = { id: 'user_id', username: 'user_name', isAdmin: false };

describe('conversation model converters', () => {
  const creationDate = '2024-09-04T06:44:17.944Z';
  const updateDate = '2025-08-04T06:44:19.123Z';
  const roundCreationDate = '2025-08-04T07:42:20.789Z';

  beforeEach(() => {
    getToolResultIdMock.mockReturnValue('some-result-id');
  });

  describe('fromEs', () => {
    const documentBase = (): ConversationDocument => {
      return {
        _id: 'conv_id',
        _seq_no: 1,
        _primary_term: 1,
        _source: {
          agent_id: 'agent_id',
          title: 'conv_title',
          user_id: 'user_id',
          user_name: 'user_name',
          space: 'space',
          conversation_rounds: [
            {
              id: 'round-1',
              status: ConversationRoundStatus.completed,
              input: {
                message: 'some message',
              },
              response: {
                message: 'some response',
              },
              steps: [],
              started_at: roundCreationDate,
              time_to_first_token: 42,
              time_to_last_token: 100,
              model_usage: {
                connector_id: 'unknown',
                llm_calls: 1,
                input_tokens: 12,
                output_tokens: 42,
              },
            },
          ],
          created_at: creationDate,
          updated_at: updateDate,
        },
      };
    };

    it('deserializes the conversation with new conversation_rounds field', () => {
      const serialized = documentBase();

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized).toEqual({
        id: 'conv_id',
        title: 'conv_title',
        agent_id: 'agent_id',
        user: {
          id: 'user_id',
          username: 'user_name',
        },
        access_control: {
          access_mode: ConversationAccessControlMode.Private,
          entries: [],
        },
        read_only: false,
        created_at: '2024-09-04T06:44:17.944Z',
        updated_at: '2025-08-04T06:44:19.123Z',
        read: false,
        read_by: [],
        pinned: false,
        pinned_by: [],
        rounds: [
          {
            id: 'round-1',
            status: ConversationRoundStatus.completed,
            input: {
              message: 'some message',
            },
            response: {
              message: 'some response',
            },
            steps: [],
            started_at: roundCreationDate,
            time_to_first_token: 42,
            time_to_last_token: 100,
            model_usage: {
              connector_id: 'unknown',
              llm_calls: 1,
              input_tokens: 12,
              output_tokens: 42,
            },
          },
        ],
        // Derived from rounds on read; content covered by rounds_to_events.test.ts.
        events: expect.any(Array),
      });

      // Wiring check: events are derived from these rounds.
      expect(deserialized.events?.[0]?.id).toBe('round-1::user_message');
    });

    it('seeds read_by for a legacy owner-read document', () => {
      const serialized = documentBase();
      serialized._source.read = true;

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.read).toBe(true);
      expect(deserialized.read_by).toEqual([{ userId: 'user_id' }]);
    });

    it('preserves owner read_by for a legacy read document viewed by a non-owner', () => {
      const serialized = documentBase();
      serialized._source.read = true;

      const deserialized = fromEs(serialized, {
        id: 'other_user_id',
        username: 'other_user_name',
        isAdmin: false,
      });

      expect(deserialized.read).toBe(false);
      expect(deserialized.read_by).toEqual([{ userId: 'user_id' }]);
    });

    it('preserves explicit read_by instead of overwriting it from the legacy read flag', () => {
      const serialized = documentBase();
      serialized._source.read = true;
      serialized._source.read_by = [{ userId: 'other_user_id' }];

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.read).toBe(false);
      expect(deserialized.read_by).toEqual([{ userId: 'other_user_id' }]);
    });

    it('seeds pinned_by for a legacy owner-pinned document', () => {
      const serialized = documentBase();
      serialized._source.pinned = true;

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.pinned).toBe(true);
      expect(deserialized.pinned_by).toEqual([{ userId: 'user_id' }]);
    });

    it('preserves owner pinned_by for a legacy pinned document viewed by a non-owner', () => {
      const serialized = documentBase();
      serialized._source.pinned = true;

      const deserialized = fromEs(serialized, {
        id: 'other_user_id',
        username: 'other_user_name',
        isAdmin: false,
      });

      expect(deserialized.pinned).toBe(false);
      expect(deserialized.pinned_by).toEqual([{ userId: 'user_id' }]);
    });

    it('preserves explicit pinned_by instead of overwriting it from the legacy pinned flag', () => {
      const serialized = documentBase();
      serialized._source.pinned = true;
      serialized._source.pinned_by = [{ userId: 'other_user_id' }];

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.pinned).toBe(false);
      expect(deserialized.pinned_by).toEqual([{ userId: 'other_user_id' }]);
    });

    it('deserializes the conversation with legacy rounds field', () => {
      const serialized = documentBase();
      // @ts-ignore simulating legacy document
      delete serialized._source.conversation_rounds;
      serialized._source!.rounds = [
        {
          id: 'round-legacy',
          status: ConversationRoundStatus.completed,
          input: {
            message: 'legacy message',
          },
          response: {
            message: 'legacy response',
          },
          steps: [],
          started_at: roundCreationDate,
          time_to_first_token: 0,
          time_to_last_token: 0,
          model_usage: {
            connector_id: 'unknown',
            llm_calls: 1,
            input_tokens: 12,
            output_tokens: 42,
          },
        },
      ];
      serialized._source!.state = createTestState();

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized).toEqual({
        id: 'conv_id',
        title: 'conv_title',
        agent_id: 'agent_id',
        user: {
          id: 'user_id',
          username: 'user_name',
        },
        access_control: {
          access_mode: ConversationAccessControlMode.Private,
          entries: [],
        },
        read_only: false,
        created_at: '2024-09-04T06:44:17.944Z',
        updated_at: '2025-08-04T06:44:19.123Z',
        read: false,
        read_by: [],
        pinned: false,
        pinned_by: [],
        rounds: [
          {
            id: 'round-legacy',
            status: ConversationRoundStatus.completed,
            input: {
              message: 'legacy message',
            },
            response: {
              message: 'legacy response',
            },
            steps: [],
            started_at: roundCreationDate,
            time_to_first_token: 0,
            time_to_last_token: 0,
            model_usage: {
              connector_id: 'unknown',
              llm_calls: 1,
              input_tokens: 12,
              output_tokens: 42,
            },
          },
        ],
        state: createTestState(),
        events: expect.any(Array),
      });

      // Wiring check: events are derived from these rounds.
      expect(deserialized.events?.[0]?.id).toBe('round-legacy::user_message');
    });

    it('deserializes the steps', () => {
      const serialized = documentBase();
      serialized._source!.conversation_rounds[0].steps = [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool_call_id',
          tool_id: 'tool_id',
          params: {
            param1: 'value1',
          },
          results: '[{"type":"other","data":{"someData":"someValue"}}]',
        },
        {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'reasoning',
        },
      ];

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.rounds[0].steps).toEqual([
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool_call_id',
          tool_id: 'tool_id',
          params: {
            param1: 'value1',
          },
          progression: [],
          results: [
            {
              tool_result_id: 'some-result-id',
              type: ToolResultType.other,
              data: { someData: 'someValue' },
            },
          ],
          tool_origin: undefined,
        },
        {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'reasoning',
        },
      ]);
    });

    it('adds tool_call_id for results without it', () => {
      const serialized = documentBase();
      serialized._source!.conversation_rounds[0].steps = [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool_call_id',
          tool_id: 'tool_id',
          params: {
            param1: 'value1',
          },
          results:
            '[{"tool_result_id": "foo", "type":"other","data":{"someData":"someValue"}}, {"type":"other","data":{"someData":"someValue"}}]',
        },
        {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'reasoning',
        },
      ];

      const deserialized = fromEs(serialized, requestingUser);

      const results = deserialized.rounds[0].steps
        .filter(isToolCallStep)
        .flatMap((step) => step.results);

      expect(results.map((result) => result.tool_result_id)).toEqual(['foo', 'some-result-id']);
    });

    it('migrates legacy tabular_data type to esqlResults', () => {
      const serialized = documentBase();
      serialized._source!.conversation_rounds[0].steps = [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool_call_id',
          tool_id: 'tool_id',
          params: {},
          results: JSON.stringify([
            {
              tool_result_id: 'result-1',
              type: 'tabular_data',
              data: {
                source: 'esql',
                query: 'FROM logs | LIMIT 10',
                columns: [{ name: 'message', type: 'keyword' }],
                values: [['test message']],
              },
            },
            {
              tool_result_id: 'result-2',
              type: 'query',
              data: { esql: 'FROM logs | LIMIT 10' },
            },
          ]),
        },
      ];

      const deserialized = fromEs(serialized, requestingUser);

      const results = deserialized.rounds[0].steps
        .filter(isToolCallStep)
        .flatMap((step) => step.results);

      expect(results).toHaveLength(2);
      // tabular_data should be migrated to esqlResults
      expect(results[0].type).toBe(ToolResultType.esqlResults);
      expect(results[0].data).toEqual({
        source: 'esql',
        query: 'FROM logs | LIMIT 10',
        columns: [{ name: 'message', type: 'keyword' }],
        values: [['test message']],
      });
      // other types should remain unchanged
      expect(results[1].type).toBe(ToolResultType.query);
    });

    it('infers tool_origin as internal for attachment tools missing the field', () => {
      const serialized = documentBase();
      serialized._source!.conversation_rounds[0].steps = [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'call-1',
          tool_id: 'attachments.read',
          params: {},
          results: '[]',
        },
      ];

      const deserialized = fromEs(serialized, requestingUser);

      const step = deserialized.rounds[0].steps.filter(isToolCallStep)[0];
      expect(step.tool_origin).toBe(ToolOrigin.internal);
    });

    it('infers tool_origin as internal for filestore tools missing the field', () => {
      const serialized = documentBase();
      serialized._source!.conversation_rounds[0].steps = [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'call-1',
          tool_id: 'filestore.read',
          params: {},
          results: '[]',
        },
      ];

      const deserialized = fromEs(serialized, requestingUser);

      const step = deserialized.rounds[0].steps.filter(isToolCallStep)[0];
      expect(step.tool_origin).toBe(ToolOrigin.internal);
    });

    it('leaves tool_origin undefined for unknown tools missing the field', () => {
      const serialized = documentBase();
      serialized._source!.conversation_rounds[0].steps = [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'call-1',
          tool_id: 'some.custom.tool',
          params: {},
          results: '[]',
        },
      ];

      const deserialized = fromEs(serialized, requestingUser);

      const step = deserialized.rounds[0].steps.filter(isToolCallStep)[0];
      expect(step.tool_origin).toBeUndefined();
    });

    it('preserves existing tool_origin when already set', () => {
      const serialized = documentBase();
      serialized._source!.conversation_rounds[0].steps = [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'call-1',
          tool_id: 'my.registry.tool',
          params: {},
          results: '[]',
          tool_origin: ToolOrigin.registry,
        },
      ];

      const deserialized = fromEs(serialized, requestingUser);

      const step = deserialized.rounds[0].steps.filter(isToolCallStep)[0];
      expect(step.tool_origin).toBe(ToolOrigin.registry);
    });

    it('deserializes conversation with attachments', () => {
      const serialized = documentBase();
      serialized._source!.attachments = [
        {
          id: 'att-1',
          type: 'text',
          versions: [
            {
              version: 1,
              data: { content: 'Hello' },
              created_at: creationDate,
              content_hash: 'abc123',
              estimated_tokens: 5,
            },
          ],
          current_version: 1,
        },
      ];
      serialized._source!.state = createTestState();

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.attachments).toEqual([
        {
          id: 'att-1',
          type: 'text',
          versions: [
            {
              version: 1,
              data: { content: 'Hello' },
              created_at: creationDate,
              content_hash: 'abc123',
              estimated_tokens: 5,
            },
          ],
          current_version: 1,
        },
      ]);
      expect(deserialized.state).toEqual(createTestState());
    });

    it('deserializes conversation without attachments (old format)', () => {
      const serialized = documentBase();
      // No attachments field - old format

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.attachments).toBeUndefined();
    });

    it('deserializes conversation with state', () => {
      const serialized = documentBase();
      serialized._source!.state = createTestState();

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.state).toEqual(serialized._source!.state);
    });

    it('deserializes conversation without state (old format)', () => {
      const serialized = documentBase();
      // No state field - old format

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.state).toBeUndefined();
    });

    it('defaults access control to private for legacy conversations', () => {
      const serialized = documentBase();

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.access_control).toEqual({
        access_mode: ConversationAccessControlMode.Private,
        entries: [],
      });
    });

    it('defaults access control entries to an empty array when absent from the document', () => {
      const serialized = documentBase();
      serialized._source!.access_control = {
        access_mode: ConversationAccessControlMode.Public,
      };

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.access_control).toEqual({
        access_mode: ConversationAccessControlMode.Public,
        entries: [],
      });
    });

    it('deserializes conversation access control', () => {
      const serialized = documentBase();
      serialized._source!.access_control = {
        access_mode: ConversationAccessControlMode.Public,
        entries: [
          {
            type: 'user',
            id: 'alice-profile-id',
            role: ConversationAccessControlRole.Member,
            added_at: '2026-06-29T00:00:00.000Z',
          },
        ],
      };

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.access_control).toEqual({
        access_mode: ConversationAccessControlMode.Public,
        entries: [
          {
            type: 'user',
            id: 'alice-profile-id',
            role: ConversationAccessControlRole.Member,
            added_at: '2026-06-29T00:00:00.000Z',
          },
        ],
      });
    });

    it('deserializes first-class origin', () => {
      const serialized = documentBase();
      serialized._source!.origin = {
        external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      };

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.origin).toEqual({
        external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      });
    });

    it('defaults read_only to false when the document has no such field', () => {
      const serialized = documentBase();

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.read_only).toBe(false);
    });

    it('deserializes read_only', () => {
      const serialized = documentBase();
      serialized._source!.read_only = true;

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.read_only).toBe(true);
    });

    it('deserializes round origin and author', () => {
      const serialized = documentBase();
      serialized._source!.conversation_rounds[0].author = {
        id: 'U123',
        full_name: 'Jane Doe',
        username: 'jane',
      };
      serialized._source!.conversation_rounds[0].origin = {
        type: ConversationOriginType.Slack,
      };

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.rounds[0].origin).toEqual({
        type: 'slack',
      });
      expect(deserialized.rounds[0].author).toEqual({
        id: 'U123',
        full_name: 'Jane Doe',
        username: 'jane',
      });
    });

    // --- Events-native version gating ---------------------------------------
    // These assert the read gate: stored `events` are served only when
    // `schema_version >= 1` AND the stored projection is non-empty; otherwise
    // events are (re-)derived from rounds. `schema_version` must land on the
    // domain object so `toEs` on the OCC write path sees it.

    it('serves stored events for events-native docs', () => {
      const serialized = documentBase();
      // A distinguishing stored event id that cannot be produced by
      // `roundsToEvents(round-1)`, so the assertion below proves we returned
      // the stored projection rather than a fresh derivation.
      const storedEvents: TimelineEvent[] = [
        {
          id: 'stored-marker::user_message',
          type: TimelineEventType.userMessage,
          created_at: roundCreationDate,
          actor: { type: EventActorType.user, id: 'user_id', username: 'user_name' },
          data: { message: 'stored from disk' },
        },
      ];
      serialized._source!.schema_version = 1;
      serialized._source!.events = storedEvents;

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.schema_version).toBe(1);
      expect(deserialized.events).toEqual(storedEvents);
    });

    it('derives events for events-native docs with an empty stored projection (rolling upgrade)', () => {
      const serialized = documentBase();
      serialized._source!.schema_version = 1;
      serialized._source!.events = [];

      const deserialized = fromEs(serialized, requestingUser);

      // Version still lands on the domain object so subsequent writes stay events-native.
      expect(deserialized.schema_version).toBe(1);
      expect(deserialized.events?.[0]?.id).toBe('round-1::user_message');
    });

    it('derives events for events-native docs with no events field on the stored doc', () => {
      const serialized = documentBase();
      serialized._source!.schema_version = 1;

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.schema_version).toBe(1);
      expect(deserialized.events?.[0]?.id).toBe('round-1::user_message');
    });

    it('does not set schema_version on the domain object for legacy docs', () => {
      const serialized = documentBase();

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.schema_version).toBeUndefined();
      // Legacy docs still get a derived timeline on read for API compatibility.
      expect(deserialized.events?.[0]?.id).toBe('round-1::user_message');
    });

    it('treats a document with a stored projection but no schema_version as legacy', () => {
      // Belt-and-suspenders: `schema_version` is the sole gate. A doc with an
      // events array but no version is not events-native (should not happen in
      // practice, but the gate must be strict).
      const serialized = documentBase();
      serialized._source!.events = [
        {
          id: 'orphan::user_message',
          type: TimelineEventType.userMessage,
          created_at: roundCreationDate,
          actor: { type: EventActorType.user, id: 'user_id' },
          data: { message: 'orphan' },
        } as TimelineEvent,
      ];

      const deserialized = fromEs(serialized, requestingUser);

      expect(deserialized.schema_version).toBeUndefined();
      // Derived from rounds, not the orphan stored event.
      expect(deserialized.events?.[0]?.id).toBe('round-1::user_message');
    });
  });

  const conversationBase = (): Conversation => {
    return {
      id: 'conv_id',
      agent_id: 'agent_id',
      user: { id: 'user_id', username: 'user_name' },
      title: 'conv_title',
      created_at: creationDate,
      updated_at: updateDate,
      rounds: [
        {
          id: 'round-1',
          status: ConversationRoundStatus.completed,
          input: {
            message: 'some message',
          },
          steps: [],
          response: {
            message: 'some response',
          },
          started_at: roundCreationDate,
          time_to_first_token: 42,
          time_to_last_token: 100,
          model_usage: {
            connector_id: 'unknown',
            llm_calls: 1,
            input_tokens: 12,
            output_tokens: 42,
          },
        },
      ],
    };
  };

  describe('toConversationResponse', () => {
    it('strips internal fields from normalized conversations', () => {
      const response = toConversationResponse({
        conversation: {
          ...conversationBase(),
          read: true,
          read_by: [{ userId: 'user_id' }],
          pinned: true,
          pinned_by: [{ userId: 'user_id' }],
          access_control: {
            access_mode: ConversationAccessControlMode.Private,
            entries: [],
          },
          read_only: false,
          events: [],
        },
        resolveTemplate: jest.fn(),
      });

      expect(response).not.toHaveProperty('read_by');
      expect(response).not.toHaveProperty('pinned_by');
      expect(response.read).toBe(true);
      expect(response.pinned).toBe(true);
    });

    it('deserializes template metadata through the injected resolver', () => {
      const response = toConversationResponse({
        conversation: {
          ...conversationBase(),
          read: false,
          read_by: [],
          access_control: {
            access_mode: ConversationAccessControlMode.Private,
            entries: [],
          },
          read_only: false,
          template_id: 'test-template',
          metadata: { is_urgent: 'true' },
          events: [],
        },
        resolveTemplate: () => ({
          id: 'test-template',
          name: 'Test template',
          version: 1,
          fields: {
            is_urgent: { input_type: 'TOGGLE' },
          },
        }),
      });

      expect(response.metadata).toEqual({ is_urgent: true });
    });

    it('strips internal fields from document responses', () => {
      const response = toConversationResponseFromDocument({
        document: {
          _id: 'conv_id',
          _seq_no: 1,
          _primary_term: 1,
          _source: {
            ...toEs(
              {
                ...conversationBase(),
                read: true,
                read_by: [{ userId: 'user_id' }],
                pinned: true,
                pinned_by: [{ userId: 'user_id' }],
                access_control: {
                  access_mode: ConversationAccessControlMode.Private,
                  entries: [],
                },
                read_only: false,
                events: [],
              },
              'space'
            ),
            read_by: [{ userId: 'user_id' }],
            pinned_by: [{ userId: 'user_id' }],
          },
        },
        user: requestingUser,
        resolveTemplate: jest.fn(),
      });

      expect(response).not.toHaveProperty('read_by');
      expect(response).not.toHaveProperty('pinned_by');
      expect(response.read).toBe(true);
      expect(response.pinned).toBe(true);
    });
  });

  describe('toEs', () => {
    it('persists the per-user lists and clears the legacy read and pinned booleans', () => {
      const serialized = toEs(
        {
          ...conversationBase(),
          read: true,
          read_by: [{ userId: 'user_id' }],
          pinned: true,
          pinned_by: [{ userId: 'user_id' }],
        },
        'space'
      );

      expect(serialized.read_by).toEqual([{ userId: 'user_id' }]);
      expect(serialized.pinned_by).toEqual([{ userId: 'user_id' }]);
      expect(serialized.read).toBeUndefined();
      expect(serialized.pinned).toBeUndefined();
    });

    it('serializes the conversation using new conversation_rounds field', () => {
      const conversation = conversationBase();
      const serialized = toEs(conversation, 'another-space');

      expect(serialized).toEqual({
        agent_id: 'agent_id',
        title: 'conv_title',
        user_id: 'user_id',
        user_name: 'user_name',
        space: 'another-space',
        conversation_rounds: [
          {
            id: 'round-1',
            status: ConversationRoundStatus.completed,
            input: {
              message: 'some message',
            },
            response: {
              message: 'some response',
            },
            steps: [],
            started_at: roundCreationDate,
            time_to_first_token: 42,
            time_to_last_token: 100,
            model_usage: {
              connector_id: 'unknown',
              llm_calls: 1,
              input_tokens: 12,
              output_tokens: 42,
            },
          },
        ],
        created_at: creationDate,
        updated_at: updateDate,
        // NEW: attachments defaults to empty array
        attachments: [],
        // Legacy field explicitly set to undefined
        rounds: undefined,
        read_by: [],
        pinned_by: [],
        access_control: {
          access_mode: ConversationAccessControlMode.Private,
          entries: [],
        },
      });
      // Verify rounds is not present
      expect(serialized.rounds).toBeUndefined();
    });

    it('serializes conversation with attachments', () => {
      const conversation = conversationBase();
      conversation.attachments = [
        {
          id: 'att-1',
          type: 'text',
          versions: [
            {
              version: 1,
              data: { content: 'Hello' },
              created_at: creationDate,
              content_hash: 'abc123',
              estimated_tokens: 5,
            },
          ],
          current_version: 1,
        },
      ];
      const serialized = toEs(conversation, 'space');

      expect(serialized.attachments).toEqual([
        {
          id: 'att-1',
          type: 'text',
          versions: [
            {
              version: 1,
              data: { content: 'Hello' },
              created_at: creationDate,
              content_hash: 'abc123',
              estimated_tokens: 5,
            },
          ],
          current_version: 1,
        },
      ]);
    });

    it('serializes the steps', () => {
      const conversation = conversationBase();
      conversation.rounds[0].steps = [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool_call_id',
          tool_id: 'tool_id',
          params: { param1: 'value1' },
          results: [
            { tool_result_id: 'foo', type: ToolResultType.other, data: { someData: 'someValue' } },
          ],
        },
        {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'reasoning',
        },
      ];
      const serialized = toEs(conversation, 'space');

      expect(serialized.conversation_rounds[0].steps).toEqual([
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool_call_id',
          tool_id: 'tool_id',
          params: {
            param1: 'value1',
          },
          results: '[{"tool_result_id":"foo","type":"other","data":{"someData":"someValue"}}]',
        },
        {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'reasoning',
        },
      ]);
    });

    it('serializes conversation with state', () => {
      const conversation = conversationBase();
      conversation.state = createTestState();

      const serialized = toEs(conversation, 'space');

      expect(serialized.state).toEqual(createTestState());
    });

    it('serializes conversation without state', () => {
      const conversation = conversationBase();
      // No state field

      const serialized = toEs(conversation, 'space');

      expect(serialized.state).toBeUndefined();
    });

    it('serializes conversation access control', () => {
      const conversation = conversationBase();
      conversation.access_control = {
        access_mode: ConversationAccessControlMode.Public,
        entries: [],
      };

      const serialized = toEs(conversation, 'space');

      expect(serialized.access_control).toEqual({
        access_mode: ConversationAccessControlMode.Public,
        entries: [],
      });
    });

    it('defaults access control to private with no entries when the conversation has none', () => {
      const conversation = conversationBase();
      conversation.access_control = undefined;

      const serialized = toEs(conversation, 'space');

      expect(serialized.access_control).toEqual({
        access_mode: ConversationAccessControlMode.Private,
        entries: [],
      });
    });

    it('preserves access control entries when serializing', () => {
      const conversation = conversationBase();
      conversation.access_control = {
        access_mode: ConversationAccessControlMode.Private,
        entries: [
          {
            type: 'user',
            id: 'alice-profile-id',
            role: ConversationAccessControlRole.Member,
            added_at: '2026-06-29T00:00:00.000Z',
          },
        ],
      };

      const serialized = toEs(conversation, 'space');

      expect(serialized.access_control).toEqual({
        access_mode: ConversationAccessControlMode.Private,
        entries: [
          {
            type: 'user',
            id: 'alice-profile-id',
            role: ConversationAccessControlRole.Member,
            added_at: '2026-06-29T00:00:00.000Z',
          },
        ],
      });
    });

    it('serializes first-class origin', () => {
      const conversation = conversationBase();
      conversation.origin = {
        external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      };

      const serialized = toEs(conversation, 'space');

      expect(serialized.origin).toEqual({
        external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      });
    });

    it('serializes read_only', () => {
      const conversation = conversationBase();
      conversation.read_only = true;

      const serialized = toEs(conversation, 'space');

      expect(serialized.read_only).toBe(true);
    });

    it('round-trips read_only', () => {
      const conversation = conversationBase();
      conversation.read_only = true;

      const roundTripped = fromEs(
        {
          _id: conversation.id,
          _seq_no: 1,
          _primary_term: 1,
          _source: toEs(conversation, 'space'),
        },
        requestingUser
      );

      expect(roundTripped.read_only).toBe(true);
    });

    it('serializes round origin and author', () => {
      const conversation = conversationBase();
      conversation.rounds[0].author = {
        id: 'U123',
        full_name: 'Jane Doe',
        username: 'jane',
      };
      conversation.rounds[0].origin = {
        type: ConversationOriginType.Slack,
      };

      const serialized = toEs(conversation, 'space');

      expect(serialized.conversation_rounds[0].origin).toEqual({
        type: 'slack',
      });
      expect(serialized.conversation_rounds[0].author).toEqual({
        id: 'U123',
        full_name: 'Jane Doe',
        username: 'jane',
      });
    });

    // --- Events-native emission gating --------------------------------------
    // `toEs` emits `events` + `schema_version` iff the in-memory conversation
    // is events-native (has `schema_version >= 1`). Legacy conversations
    // (`schema_version` undefined) stay rounds-only in storage even if they
    // happen to carry a derived `events` array in memory.

    it('emits events and schema_version for events-native conversations', () => {
      const conversation = conversationBase();
      conversation.schema_version = 1;
      conversation.events = [
        {
          id: 'round-1::user_message',
          type: TimelineEventType.userMessage,
          created_at: roundCreationDate,
          actor: { type: EventActorType.user, id: 'user_id', username: 'user_name' },
          data: { message: 'some message' },
        },
      ];

      const serialized = toEs(conversation, 'space');

      expect(serialized.schema_version).toBe(1);
      expect(serialized.events).toEqual(conversation.events);
    });

    it('omits events and schema_version for legacy conversations', () => {
      const conversation = conversationBase();
      // Even if a derived `events` array is present in memory (as `fromEs`
      // sets it for legacy docs on read), `toEs` must not persist it without
      // a `schema_version` — that is what keeps legacy docs from silently
      // migrating on write.
      conversation.events = [
        {
          id: 'round-1::user_message',
          type: TimelineEventType.userMessage,
          created_at: roundCreationDate,
          actor: { type: EventActorType.user, id: 'user_id', username: 'user_name' },
          data: { message: 'some message' },
        },
      ];

      const serialized = toEs(conversation, 'space');

      expect(serialized.schema_version).toBeUndefined();
      expect(serialized.events).toBeUndefined();
    });

    it('emits an empty events array when the conversation is events-native but events is unset', () => {
      // Guardrail: if a caller ever hands `toEs` an events-native conversation
      // with `events` missing (should be prevented by `updateConversation`),
      // the write is still coherent (`schema_version` present ⇒ `events`
      // present) rather than dropping the version silently.
      const conversation = conversationBase();
      conversation.schema_version = 1;

      const serialized = toEs(conversation, 'space');

      expect(serialized.schema_version).toBe(1);
      expect(serialized.events).toEqual([]);
    });
  });

  describe('createRequestToEs', () => {
    it('creates an unpinned, unread conversation with empty per-user lists', () => {
      const serialized = createRequestToEs({
        conversation: { agent_id: 'agent_id', title: 'conv_title', rounds: [] },
        space: 'space',
        currentUser: { id: 'user_id', username: 'user_name' },
        creationDate: new Date(creationDate),
      });

      expect(serialized.read_by).toEqual([]);
      expect(serialized.pinned_by).toEqual([]);
      expect(serialized.read).toBeUndefined();
      expect(serialized.pinned).toBeUndefined();
    });

    it('includes state property when creating new conversation', () => {
      const conversation = {
        agent_id: 'agent_id',
        title: 'conv_title',
        rounds: [],
        state: createTestState(),
      };

      const serialized = createRequestToEs({
        conversation,
        space: 'space',
        currentUser: { id: 'user_id', username: 'user_name' },
        creationDate: new Date(creationDate),
      });

      expect(serialized.state).toEqual(conversation.state);
    });

    it('sets state to undefined when creating conversation without state', () => {
      const conversation = {
        agent_id: 'agent_id',
        title: 'conv_title',
        rounds: [],
      };

      const serialized = createRequestToEs({
        conversation,
        space: 'space',
        currentUser: { id: 'user_id', username: 'user_name' },
        creationDate: new Date(creationDate),
      });

      expect(serialized.state).toBeUndefined();
    });

    it('defaults access control to private when creating a conversation', () => {
      const conversation = {
        agent_id: 'agent_id',
        title: 'conv_title',
        rounds: [],
      };

      const serialized = createRequestToEs({
        conversation,
        space: 'space',
        currentUser: { id: 'user_id', username: 'user_name' },
        creationDate: new Date(creationDate),
      });

      expect(serialized.access_control).toEqual({
        access_mode: ConversationAccessControlMode.Private,
        entries: [],
      });
    });

    it('serializes explicit access control when creating a conversation', () => {
      const conversation = {
        agent_id: 'agent_id',
        title: 'conv_title',
        rounds: [],
        access_control: {
          access_mode: ConversationAccessControlMode.Public,
          entries: [],
        },
      };

      const serialized = createRequestToEs({
        conversation,
        space: 'space',
        currentUser: { id: 'user_id', username: 'user_name' },
        creationDate: new Date(creationDate),
      });

      expect(serialized.access_control).toEqual({
        access_mode: ConversationAccessControlMode.Public,
        entries: [],
      });
    });

    it('defaults read_only to false when creating a conversation', () => {
      const conversation = {
        agent_id: 'agent_id',
        title: 'conv_title',
        rounds: [],
      };

      const serialized = createRequestToEs({
        conversation,
        space: 'space',
        currentUser: { id: 'user_id', username: 'user_name' },
        creationDate: new Date(creationDate),
      });

      expect(serialized.read_only).toBe(false);
    });

    it('serializes explicit read_only when creating a conversation', () => {
      const conversation = {
        agent_id: 'agent_id',
        title: 'conv_title',
        rounds: [],
        read_only: true,
      };

      const serialized = createRequestToEs({
        conversation,
        space: 'space',
        currentUser: { id: 'user_id', username: 'user_name' },
        creationDate: new Date(creationDate),
      });

      expect(serialized.read_only).toBe(true);
    });

    it('serializes first-class origin when creating a conversation', () => {
      const conversation = {
        agent_id: 'agent_id',
        title: 'conv_title',
        rounds: [],
        origin: {
          external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
        },
      };

      const serialized = createRequestToEs({
        conversation,
        space: 'space',
        currentUser: { id: 'user_id', username: 'user_name' },
        creationDate: new Date(creationDate),
      });

      expect(serialized.origin).toEqual({
        external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      });
    });

    // --- Single promoter to events-native -----------------------------------
    // `createRequestToEs` is the only place that stamps `schema_version`; new
    // conversations are always events-native from round 1. It also *derives*
    // `events` from the caller's rounds rather than trusting an array off the
    // request, so each field has exactly one writer.

    it('stamps schema_version at CONVERSATION_SCHEMA_VERSION on every create', () => {
      const conversation = {
        agent_id: 'agent_id',
        title: 'conv_title',
        rounds: [],
      };

      const serialized = createRequestToEs({
        conversation,
        space: 'space',
        currentUser: { id: 'user_id', username: 'user_name' },
        creationDate: new Date(creationDate),
      });

      expect(serialized.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
      // New conversation with no rounds ⇒ no events yet, but the field is
      // stamped so `fromEs`'s empty-events fallback derives on the very first
      // read after create (and subsequent writes stay events-native).
      expect(serialized.events).toEqual([]);
    });

    it('derives events from rounds on create when no explicit events are supplied', () => {
      const conversation: Parameters<typeof createRequestToEs>[0]['conversation'] = {
        agent_id: 'agent_id',
        title: 'conv_title',
        rounds: [
          {
            id: 'round-seed',
            status: ConversationRoundStatus.completed,
            input: { message: 'hello' },
            response: { message: 'hi' },
            steps: [],
            started_at: roundCreationDate,
            time_to_first_token: 10,
            time_to_last_token: 50,
            model_usage: {
              connector_id: 'unknown',
              llm_calls: 1,
              input_tokens: 3,
              output_tokens: 4,
            },
          },
        ],
      };

      const serialized = createRequestToEs({
        conversation,
        space: 'space',
        currentUser: { id: 'user_id', username: 'user_name' },
        creationDate: new Date(creationDate),
      });

      // Ids match the round-derived shape exactly.
      expect(serialized.events?.map((event) => event.id)).toEqual([
        'round-seed::user_message',
        'round-seed::execution_started',
        'round-seed::execution_terminated',
      ]);
    });

    it('seeds the timeline from a caller-supplied events array when rounds is empty (atomic create-with-event path)', () => {
      const seedEvent: TimelineEvent = {
        id: 'round-1::user_message',
        type: TimelineEventType.userMessage,
        created_at: '2025-01-01T00:00:00.000Z',
        actor: { type: EventActorType.user, id: 'user_id', username: 'user_name' },
        data: { message: 'hello', attachment_refs: [] },
      };
      const conversation: Parameters<typeof createRequestToEs>[0]['conversation'] = {
        agent_id: 'agent_id',
        title: 'conv_title',
        rounds: [],
        events: [seedEvent],
      };

      const serialized = createRequestToEs({
        conversation,
        space: 'space',
        currentUser: { id: 'user_id', username: 'user_name' },
        creationDate: new Date(creationDate),
      });

      // Caller-supplied events win over the empty round-derived projection.
      expect(serialized.events?.map((event) => event.id)).toEqual(['round-1::user_message']);
    });
  });

  // ---------------------------------------------------------------------------
  // Version gate + reconcile: updateConversation and isEventsNativeVersion
  // ---------------------------------------------------------------------------

  describe('isEventsNativeVersion', () => {
    it('accepts any numeric version at or above the frozen floor (monotonic, future-proof)', () => {
      expect(isEventsNativeVersion(MIN_EVENTS_NATIVE_SCHEMA_VERSION)).toBe(true);
      // A hypothetical future v2 doc is still events-native — the gate is
      // "has a stored projection", not "is exactly the current format".
      expect(isEventsNativeVersion(MIN_EVENTS_NATIVE_SCHEMA_VERSION + 1)).toBe(true);
      expect(isEventsNativeVersion(99)).toBe(true);
    });

    it('rejects undefined, 0, and non-numeric values', () => {
      expect(isEventsNativeVersion(undefined)).toBe(false);
      expect(isEventsNativeVersion(0)).toBe(false);
      // @ts-expect-error runtime guard: value could arrive as non-number from ES.
      expect(isEventsNativeVersion('1')).toBe(false);
      // @ts-expect-error runtime guard.
      expect(isEventsNativeVersion(null)).toBe(false);
    });

    it('stays below the current format so older-but-native docs keep reading as native', () => {
      expect(MIN_EVENTS_NATIVE_SCHEMA_VERSION).toBeLessThanOrEqual(CONVERSATION_SCHEMA_VERSION);

      for (
        let version = MIN_EVENTS_NATIVE_SCHEMA_VERSION;
        version <= CONVERSATION_SCHEMA_VERSION;
        version++
      ) {
        expect(isEventsNativeVersion(version)).toBe(true);
      }
    });
  });

  describe('updateConversation', () => {
    // Fixture helpers. Two shapes matter: a legacy stored conversation (no
    // schema_version, no events on `_source`), and an events-native stored
    // conversation (schema_version === 1 with the stored round-derived
    // projection already merged onto the in-memory object by `fromEs`).
    const legacyStored = (): Conversation => ({
      id: 'conv-legacy',
      agent_id: 'agent_id',
      user: { id: 'user_id', username: 'user_name' },
      title: 'legacy title',
      created_at: creationDate,
      updated_at: updateDate,
      rounds: [
        {
          id: 'round-1',
          status: ConversationRoundStatus.completed,
          input: { message: 'hello' },
          response: { message: 'hi' },
          steps: [],
          started_at: roundCreationDate,
          time_to_first_token: 5,
          time_to_last_token: 20,
          model_usage: {
            connector_id: 'unknown',
            llm_calls: 1,
            input_tokens: 1,
            output_tokens: 2,
          },
        },
      ],
    });

    const eventsNativeStored = (): Conversation => {
      const base = legacyStored();
      return {
        ...base,
        id: 'conv-native',
        schema_version: CONVERSATION_SCHEMA_VERSION,
        // Simulates what `fromEs` would have merged onto the in-memory conv
        // for an events-native doc: fresh round-derived events, no additive.
        events: roundsToEvents(base),
      };
    };

    it('never promotes legacy conversations on update', () => {
      const conversation = legacyStored();

      const updated = updateConversation({
        conversation,
        update: { id: conversation.id, title: 'renamed' },
        space: 'space',
        updateDate: new Date(updateDate),
      });

      expect(updated.title).toBe('renamed');
      expect(updated.schema_version).toBeUndefined();
      // `events` is not the responsibility of `updateConversation` for legacy
      // docs — `toEs` will omit them regardless of what is on the object.
      expect(updated.events).toBeUndefined();
    });

    it('preserves stored events on a title-only update to an events-native doc', () => {
      const conversation = eventsNativeStored();
      const originalEventIds = conversation.events!.map((event) => event.id);

      const updated = updateConversation({
        conversation,
        update: { id: conversation.id, title: 'renamed' },
        space: 'space',
        updateDate: new Date(updateDate),
      });

      // Reconcile from the (unchanged) rounds ⇒ same ids as before, and no
      // additive events were dropped or added.
      expect(updated.title).toBe('renamed');
      expect(updated.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
      expect(updated.events?.map((event) => event.id)).toEqual(originalEventIds);
    });

    it('regenerates round-derived events when rounds change', () => {
      const conversation = eventsNativeStored();
      const newRound = {
        ...conversation.rounds[0],
        id: 'round-2',
        started_at: '2025-08-04T07:42:22.000Z',
        input: { message: 'second' },
        response: { message: 'answered' },
      };

      const updated = updateConversation({
        conversation,
        update: { id: conversation.id, rounds: [...conversation.rounds, newRound] },
        space: 'space',
        updateDate: new Date(updateDate),
      });

      // Old round-derived events remain (round-1 still exists); new ones added
      // for round-2. No stale entries linger and no dupes appear.
      expect(updated.events?.map((event) => event.id)).toEqual([
        'round-1::user_message',
        'round-1::execution_started',
        'round-1::execution_terminated',
        'round-2::user_message',
        'round-2::execution_started',
        'round-2::execution_terminated',
      ]);
    });

    it('drops stale round-derived events when a round is removed (regenerate/regenerate)', () => {
      const conversation = eventsNativeStored();
      // Simulate the "regenerate" flow: the stored events still carry
      // round-1's entries, but the caller replaces rounds with just round-2.
      // Reconcile must drop the round-1 events cleanly, not keep them as
      // "additive".
      const round2 = {
        ...conversation.rounds[0],
        id: 'round-2',
        input: { message: 'regenerated' },
        response: { message: 'new answer' },
      };

      const updated = updateConversation({
        conversation,
        update: { id: conversation.id, rounds: [round2] },
        space: 'space',
        updateDate: new Date(updateDate),
      });

      expect(updated.events?.map((event) => event.id)).toEqual([
        'round-2::user_message',
        'round-2::execution_started',
        'round-2::execution_terminated',
      ]);
    });

    it('preserves additive events (reconcile/additive-survival)', () => {
      // This is the core new invariant. Step 2 will wire error production; the
      // machinery has to be ready to preserve additive events (ids without a
      // round-derived suffix) across a recompute. Simulate that by seeding a
      // synthetic `execution_failed` with a non-round-derived id.
      const conversation = eventsNativeStored();
      // Typed as the concrete event so `data` narrows to `ExecutionFailedEventData`.
      // A generic `TimelineEvent` cast would collapse the discriminated union
      // and hide a real shape mismatch here.
      const additive: ExecutionFailedEvent = {
        id: 'orphan-failure-abc',
        type: TimelineEventType.executionFailed,
        created_at: roundCreationDate,
        actor: { type: EventActorType.agent, id: 'agent_id' },
        execution_id: 'round-1::execution',
        trigger_event_id: 'round-1::user_message',
        data: {
          error: {
            code: AgentBuilderErrorCode.internalError,
            message: 'boom',
          },
        },
      };
      conversation.events = [...conversation.events!, additive];

      const updated = updateConversation({
        conversation,
        update: { id: conversation.id, title: 'renamed' },
        space: 'space',
        updateDate: new Date(updateDate),
      });

      expect(updated.events?.map((event) => event.id)).toEqual([
        'round-1::user_message',
        'round-1::execution_started',
        'orphan-failure-abc',
        'round-1::execution_terminated',
      ]);
      expect(updated.events?.find((event) => event.id === additive.id)).toEqual(additive);
    });

    it('keeps additive events verbatim even when their round is removed (keep-all)', () => {
      const conversation = eventsNativeStored();
      const additive: ExecutionFailedEvent = {
        id: 'failed-on-removed-round',
        type: TimelineEventType.executionFailed,
        created_at: '2025-08-04T07:42:30.000Z',
        actor: { type: EventActorType.agent, id: 'agent_id' },
        execution_id: 'round-1::execution',
        trigger_event_id: 'round-1::user_message',
        data: {
          error: {
            code: AgentBuilderErrorCode.internalError,
            message: 'boom',
          },
        },
      };
      conversation.events = [...conversation.events!, additive];

      // Regenerate: replace round-1 with a fresh round-2. The additive's
      // execution_id / trigger_event_id now dangle.
      const round2 = {
        ...conversation.rounds[0],
        id: 'round-2',
        started_at: '2025-08-04T07:42:21.000Z',
        input: { message: 'regenerated' },
        response: { message: 'new answer' },
      };

      const updated = updateConversation({
        conversation,
        update: { id: conversation.id, rounds: [round2] },
        space: 'space',
        updateDate: new Date(updateDate),
      });

      const preserved = updated.events?.find((event) => event.id === additive.id);
      expect(preserved).toEqual(additive);
      expect(preserved?.execution_id).toBe('round-1::execution');
      expect(preserved?.trigger_event_id).toBe('round-1::user_message');
      expect(updated.events?.some((event) => event.id.startsWith('round-1::'))).toBe(false);
      expect(updated.events?.map((event) => event.id)).toEqual([
        'round-2::user_message',
        'round-2::execution_started',
        'round-2::execution_terminated',
        'failed-on-removed-round',
      ]);
    });

    it('sorts the reconciled projection chronologically by created_at', () => {
      const conversation = eventsNativeStored();
      const round1 = {
        ...conversation.rounds[0],
        started_at: '2026-01-01T00:00:00.000Z',
        time_to_last_token: 100,
      };
      const round2 = {
        ...conversation.rounds[0],
        id: 'round-2',
        started_at: '2026-01-01T00:00:10.000Z',
        time_to_last_token: 100,
      };
      const additive: ExecutionFailedEvent = {
        id: 'between-rounds-failure',
        type: TimelineEventType.executionFailed,
        created_at: '2026-01-01T00:00:05.000Z',
        actor: { type: EventActorType.agent, id: 'agent_id' },
        execution_id: 'round-1::execution',
        trigger_event_id: 'round-1::user_message',
        data: {
          error: { code: AgentBuilderErrorCode.internalError, message: 'boom' },
        },
      };
      conversation.rounds = [round1, round2];
      conversation.events = [...roundsToEvents(conversation), additive];

      const updated = updateConversation({
        conversation,
        update: { id: conversation.id, title: 'unchanged' },
        space: 'space',
        updateDate: new Date(updateDate),
      });

      expect(updated.events?.map((event) => event.id)).toEqual([
        'round-1::user_message',
        'round-1::execution_started',
        'round-1::execution_terminated',
        'between-rounds-failure',
        'round-2::user_message',
        'round-2::execution_started',
        'round-2::execution_terminated',
      ]);
    });

    it('discards a schema_version supplied in the update payload (version is server-owned)', () => {
      const conversation = eventsNativeStored();
      const originalEventIds = conversation.events!.map((event) => event.id);

      const updated = updateConversation({
        conversation,
        // Cast: routes never accept schema_version, but the strip must be defensive.
        update: {
          id: conversation.id,
          title: 'renamed',
          schema_version: 42,
        } as Parameters<typeof updateConversation>[0]['update'] & {
          schema_version: number;
        },
        space: 'space',
        updateDate: new Date(updateDate),
      });

      // Version comes from the stored conversation (re-stamped at the current
      // format), never from the payload.
      expect(updated.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
      // Reconciled events come from rounds; the same ids as before the update.
      expect(updated.events?.map((event) => event.id)).toEqual(originalEventIds);
    });

    it('trusts events supplied in the update payload (appendEvents path derives rounds from them)', () => {
      const conversation = eventsNativeStored();
      const appended: TimelineEvent = {
        id: 'appended::user_message',
        type: TimelineEventType.userMessage,
        created_at: roundCreationDate,
        actor: { type: EventActorType.user, id: 'user_id', username: 'user_name' },
        data: { message: 'from appendEvents' },
      };

      const updated = updateConversation({
        conversation,
        update: {
          id: conversation.id,
          events: [...conversation.events!, appended],
        } as Parameters<typeof updateConversation>[0]['update'] & {
          events: TimelineEvent[];
        },
        space: 'space',
        updateDate: new Date(updateDate),
      });

      expect(updated.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
      expect(updated.events?.some((event) => event.id === 'appended::user_message')).toBe(true);
    });

    it('honors caller-supplied rounds alongside events, skipping the rounds rebuild (step-only appendEvents batches)', () => {
      const conversation = eventsNativeStored();
      const passedThroughRounds = [
        { ...conversation.rounds[0], response: { message: 'stored truth' } },
      ];

      const updated = updateConversation({
        conversation,
        update: {
          id: conversation.id,
          events: conversation.events!,
          rounds: passedThroughRounds,
        } as Parameters<typeof updateConversation>[0]['update'] & {
          events: TimelineEvent[];
        },
        space: 'space',
        updateDate: new Date(updateDate),
      });

      expect(updated.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
      expect(updated.rounds).toBe(passedThroughRounds);
      expect(updated.rounds[0].response?.message).toBe('stored truth');
    });

    it('promotes a legacy conversation to events-native when a caller supplies events (appendEvents on a legacy doc)', () => {
      const conversation = legacyStored();
      const seededEvents: TimelineEvent[] = [
        {
          id: 'seed::user_message',
          type: TimelineEventType.userMessage,
          created_at: roundCreationDate,
          actor: { type: EventActorType.user, id: 'user_id', username: 'user_name' },
          data: { message: 'seed' },
        },
      ];

      const updated = updateConversation({
        conversation,
        update: {
          id: conversation.id,
          events: seededEvents,
        } as Parameters<typeof updateConversation>[0]['update'] & {
          events: TimelineEvent[];
        },
        space: 'space',
        updateDate: new Date(updateDate),
      });

      expect(updated.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
      expect(updated.events?.map((event) => event.id)).toEqual(['seed::user_message']);
    });

    it('keeps events-native docs stamped with the native marker on update', () => {
      const conversation = eventsNativeStored();
      conversation.schema_version = CONVERSATION_SCHEMA_VERSION;

      const updated = updateConversation({
        conversation,
        update: { id: conversation.id, title: 'renamed' },
        space: 'space',
        updateDate: new Date(updateDate),
      });

      expect(updated.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
    });

    it('stamps updated_at from the supplied updateDate and space from the caller', () => {
      // Belt-and-suspenders: the original behaviour of `updateConversation` —
      // stamping `updated_at` from `updateDate` and overwriting `space` — is
      // preserved on both branches.
      const conversation = eventsNativeStored();
      const nextDate = new Date('2027-01-01T00:00:00.000Z');

      const updated = updateConversation({
        conversation,
        update: { id: conversation.id, title: 'renamed' },
        space: 'different-space',
        updateDate: nextDate,
      });

      expect(updated.updated_at).toBe(nextDate.toISOString());
      // `space` is included on the merged object for the OCC index step —
      // `toEs` re-emits it into the stored document.
      expect((updated as Conversation & { space: string }).space).toBe('different-space');
    });
  });

  // ---------------------------------------------------------------------------
  // Template fields: metadata + template_id round-trips
  // ---------------------------------------------------------------------------

  describe('metadata, template_id, and template_version round-trips', () => {
    describe('fromEs', () => {
      it('deserializes metadata, template_id, and template_version when present in the document', () => {
        const doc: ConversationDocument = {
          _id: 'conv-tmpl',
          _seq_no: 1,
          _primary_term: 1,
          _source: {
            agent_id: 'agent_id',
            title: 'Template conv',
            user_id: 'user_id',
            user_name: 'user_name',
            space: 'space',
            conversation_rounds: [],
            created_at: creationDate,
            updated_at: updateDate,
            template_id: 'phishing',
            template_version: 2,
            metadata: { severity: 'high', tags: ['tag-a', 'tag-b'] },
          },
        };

        const result = fromEs(doc, requestingUser);

        expect(result.template_id).toBe('phishing');
        expect(result.template_version).toBe(2);
        expect(result.metadata).toEqual({ severity: 'high', tags: ['tag-a', 'tag-b'] });
      });

      it('omits metadata, template_id, and template_version when absent from the document', () => {
        const doc: ConversationDocument = {
          _id: 'conv-no-tmpl',
          _seq_no: 1,
          _primary_term: 1,
          _source: {
            agent_id: 'agent_id',
            title: 'No template',
            user_id: 'user_id',
            user_name: 'user_name',
            space: 'space',
            conversation_rounds: [],
            created_at: creationDate,
            updated_at: updateDate,
          },
        };

        const result = fromEs(doc, requestingUser);

        expect(result.template_id).toBeUndefined();
        expect(result.template_version).toBeUndefined();
        expect(result.metadata).toBeUndefined();
      });
    });

    describe('toEs', () => {
      it('serializes metadata, template_id, and template_version when present on the conversation', () => {
        const conversation: Conversation = {
          id: 'conv-tmpl',
          agent_id: 'agent_id',
          title: 'Template conv',
          user: { id: 'user_id', username: 'user_name' },
          created_at: creationDate,
          updated_at: updateDate,
          rounds: [],
          template_id: 'security-finding',
          template_version: 3,
          metadata: { severity: 'low', entities: ['host-a', 'host-b'] },
        };

        const result = toEs(conversation, 'space');

        expect(result.template_id).toBe('security-finding');
        expect(result.template_version).toBe(3);
        expect(result.metadata).toEqual({ severity: 'low', entities: ['host-a', 'host-b'] });
      });

      it('does not include template_id, template_version, or metadata when absent', () => {
        const conversation: Conversation = {
          id: 'conv-no-tmpl',
          agent_id: 'agent_id',
          title: 'No template',
          user: { id: 'user_id', username: 'user_name' },
          created_at: creationDate,
          updated_at: updateDate,
          rounds: [],
        };

        const result = toEs(conversation, 'space');

        expect(result.template_id).toBeUndefined();
        expect(result.template_version).toBeUndefined();
        expect(result.metadata).toBeUndefined();
      });
    });

    describe('createRequestToEs', () => {
      it('serializes metadata, template_id, and template_version from a create request', () => {
        const conversation = {
          agent_id: 'agent_id',
          title: 'Template conv',
          rounds: [] as Conversation['rounds'],
          template_id: 'phishing',
          template_version: 1,
          metadata: { severity: 'critical', tags: ['spray', 'phish'] },
        };

        const result = createRequestToEs({
          conversation,
          space: 'space',
          currentUser: { id: 'user_id', username: 'user_name' },
          creationDate: new Date(creationDate),
        });

        expect(result.template_id).toBe('phishing');
        expect(result.template_version).toBe(1);
        expect(result.metadata).toEqual({ severity: 'critical', tags: ['spray', 'phish'] });
      });

      it('omits template_id, template_version, and metadata when not provided', () => {
        const conversation = {
          agent_id: 'agent_id',
          title: 'No template',
          rounds: [] as Conversation['rounds'],
        };

        const result = createRequestToEs({
          conversation,
          space: 'space',
          currentUser: { id: 'user_id', username: 'user_name' },
          creationDate: new Date(creationDate),
        });

        expect(result.template_id).toBeUndefined();
        expect(result.template_version).toBeUndefined();
        expect(result.metadata).toBeUndefined();
      });
    });
  });
});
