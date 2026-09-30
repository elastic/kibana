/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  concat,
  lastValueFrom,
  mergeMap,
  of,
  shareReplay,
  Subject,
  tap,
  throwError,
  timer,
  toArray,
  type Observable,
} from 'rxjs';
import {
  AgentBuilderErrorCode,
  AgentExecutionMode,
  ChatEventType,
  ConversationAccessControlMode,
  ConversationOriginType,
  TimelineEventType,
  isRequestAbortedError,
  type ChatAgentEvent,
  type ChatEvent,
  type RoundCompleteEvent,
  type RoundInterruptedEvent,
  type RoundStartedEvent,
  ConversationRoundStatus,
} from '@kbn/agent-builder-common';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { UserAttributes } from '@kbn/inference-tracing';
import { collectAndWriteEvents, handleAgentExecution, setUserAttributes } from './execution_runner';
import {
  createConversationClientMock,
  createEmptyConversation,
  createRound,
} from '../../test_utils';
import { loadTracingPrivacySettings, withConverseSpan } from '../../tracing';
import { executeAgent$, generateTitle, resolveServices } from './utils';
import type { Span } from '@opentelemetry/api';

jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');

  return {
    ...actual,
    executeAgent$: jest.fn(),
    resolveServices: jest.fn(),
    generateTitle: jest.fn(),
  };
});

jest.mock('uuid', () => {
  const actual = jest.requireActual('uuid');
  return {
    ...actual,
    v4: jest.fn(() => 'round-1'),
  };
});

const mockSpanSetAttribute = jest.fn();

jest.mock('../../tracing', () => {
  const actual = jest.requireActual('../../tracing');

  return {
    ...actual,
    withConverseSpan: jest.fn(
      (_opts: unknown, cb: (span: { setAttribute: jest.Mock }) => unknown) =>
        cb({ setAttribute: mockSpanSetAttribute })
    ),
    loadTracingPrivacySettings: jest.fn().mockResolvedValue({
      enabled: true,
      includeUserPrompts: true,
      includeLlmResponses: true,
      includeToolDetails: true,
      includeSystemPrompt: true,
      includeRealNames: true,
      includeRealIds: true,
      includeUserData: true,
    }),
  };
});

const executeAgentMock = executeAgent$ as jest.MockedFunction<typeof executeAgent$>;
const resolveServicesMock = resolveServices as jest.MockedFunction<typeof resolveServices>;
const withConverseSpanMock = withConverseSpan as jest.MockedFunction<typeof withConverseSpan>;
const loadTracingPrivacySettingsMock = loadTracingPrivacySettings as jest.MockedFunction<
  typeof loadTracingPrivacySettings
>;
const generateTitleMock = generateTitle as jest.MockedFunction<typeof generateTitle>;

const createModelProviderMock = () => ({
  getDefaultModel: jest.fn().mockResolvedValue({
    chatModel: { getConnector: () => ({ type: '.gen-ai' }) },
  }),
  selectModel: jest.fn().mockResolvedValue({
    chatModel: { getConnector: () => ({ type: '.gen-ai' }) },
  }),
});

const createDeps = ({
  conversationClient,
  analyticsService,
}: {
  conversationClient: ReturnType<typeof createConversationClientMock>;
  analyticsService?: { reportRoundComplete?: jest.Mock; reportRoundError?: jest.Mock };
}) =>
  ({
    logger: loggingSystemMock.createLogger(),
    analyticsService,
    runAgent: jest.fn(),
    agentService: {
      getRegistry: jest
        .fn()
        .mockResolvedValue({ get: jest.fn().mockResolvedValue({ name: 'Test agent' }) }),
    },
    meteringService: {
      reportExecution: jest.fn().mockResolvedValue(undefined),
    },
    conversationService: {
      getScopedClientAsUser: jest.fn().mockResolvedValue(conversationClient),
    },
    uiSettings: {
      asScopedToClient: jest.fn().mockReturnValue({}),
    },
    savedObjects: {
      getScopedClient: jest.fn().mockReturnValue({}),
    },
  } as never);

/**
 * Factories for the two `ChatAgentEvent`s that show up in every persistence-flow test.
 * Keep them permissive: callers can override any field via `overrides`.
 */
const makeRoundStartedEvent = (
  roundId: string = 'round-1',
  overrides: Partial<RoundStartedEvent['data']> = {}
): RoundStartedEvent =>
  ({
    type: ChatEventType.roundStarted,
    data: {
      round_id: roundId,
      input: { message: 'Hello' },
      started_at: '2024-01-01T00:00:00.000Z',
      ...overrides,
    },
  } as RoundStartedEvent);

const makeRoundCompleteEvent = (roundId: string = 'round-1'): RoundCompleteEvent =>
  ({
    type: ChatEventType.roundComplete,
    // The END append is scoped to the started round, so the completed round must carry its id.
    data: { round: createRound({ id: roundId }) },
  } as RoundCompleteEvent);

const mockAgentStream = (
  events: ChatAgentEvent[],
  mode: 'sync' | 'asyncShared' = 'sync',
  error?: Error
): void => {
  if (mode === 'sync') {
    executeAgentMock.mockReturnValue(of(...events) as Observable<ChatAgentEvent>);
    return;
  }
  const stream$: Observable<ChatAgentEvent> = error
    ? (concat(
        of(...events),
        throwError(() => error)
      ) as Observable<ChatAgentEvent>)
    : (of(...events) as Observable<ChatAgentEvent>);
  executeAgentMock.mockReturnValue(
    timer(0).pipe(
      mergeMap(() => stream$),
      shareReplay()
    )
  );
};

const stubResolveServices = (
  conversationClient: ReturnType<typeof createConversationClientMock>
): void => {
  resolveServicesMock.mockResolvedValue({
    conversationClient,
    selectedConnectorId: 'connector-1',
    modelProvider: createModelProviderMock(),
  } as never);
};

const runHandle = ({
  agentParams,
  conversationClient,
}: {
  agentParams: Record<string, unknown>;
  conversationClient: ReturnType<typeof createConversationClientMock>;
}) =>
  handleAgentExecution({
    execution: {
      executionId: 'execution-1',
      executionMode: AgentExecutionMode.conversation,
      owner: { id: 'owner-1', username: 'owner' },
      // what the execution service stores: the round it opened and how it resolved the conversation
      agentParams: {
        conversationId: 'conversation-1',
        roundId: 'round-1',
        conversationOperation: 'UPDATE',
        receivedAt: '2024-01-01T00:00:00.000Z',
        ...agentParams,
      },
    } as never,
    deps: createDeps({ conversationClient }),
    request: { headers: {} } as never,
    abortSignal: new AbortController().signal,
  });

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

describe('handleAgentExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateTitleMock.mockReturnValue(of('Generated title'));
  });

  it('loads tracing privacy settings from the request-scoped saved objects client', async () => {
    const conversation = createEmptyConversation({
      id: 'conversation-1',
      agent_id: 'test-agent',
      user: { id: 'owner-id', username: 'owner' },
    });
    const conversationClient = createConversationClientMock();
    conversationClient.get.mockResolvedValue(conversation);
    conversationClient.update.mockResolvedValue(conversation);
    stubResolveServices(conversationClient);
    executeAgentMock.mockReturnValue(
      of({
        type: ChatEventType.roundComplete,
        data: { round: createRound({}) },
      } as RoundCompleteEvent)
    );

    const request = { headers: {} } as never;
    const soClient = { id: 'so-marketing' };
    const uiSettingsClient = { id: 'ui-marketing' };
    const privacySettings = {
      enabled: true,
      includeUserPrompts: false,
      includeLlmResponses: false,
      includeToolDetails: false,
      includeSystemPrompt: false,
      includeRealNames: false,
      includeRealIds: false,
      includeUserData: false,
    };
    loadTracingPrivacySettingsMock.mockResolvedValue(privacySettings);

    const logger = loggingSystemMock.createLogger();
    const deps = createDeps({ conversationClient });
    (deps as { logger: ReturnType<typeof loggingSystemMock.createLogger> }).logger = logger;
    const getScopedClient = jest.fn().mockReturnValue(soClient);
    const asScopedToClient = jest.fn().mockReturnValue(uiSettingsClient);
    (deps as { savedObjects: { getScopedClient: jest.Mock } }).savedObjects.getScopedClient =
      getScopedClient;
    (deps as { uiSettings: { asScopedToClient: jest.Mock } }).uiSettings.asScopedToClient =
      asScopedToClient;
    (deps as { spaces: { spacesService: { getSpaceId: jest.Mock } } }).spaces = {
      spacesService: { getSpaceId: jest.fn().mockReturnValue('marketing') },
    };

    const events$ = await handleAgentExecution({
      execution: {
        executionId: 'execution-1',
        executionMode: AgentExecutionMode.conversation,
        owner: { id: 'owner-1', username: 'owner' },
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'conversation-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
          nextInput: { message: 'Hello' },
        },
      } as never,
      deps,
      request,
      abortSignal: new AbortController().signal,
    });
    await lastValueFrom(events$.pipe(toArray()));

    expect(getScopedClient).toHaveBeenCalledWith(request);
    expect(asScopedToClient).toHaveBeenCalledWith(soClient);
    expect(loadTracingPrivacySettingsMock).toHaveBeenCalledWith({
      uiSettingsClient,
      logger,
      spaceId: 'marketing',
    });
    expect(withConverseSpanMock).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'marketing',
        privacySettings,
      }),
      expect.any(Function)
    );
  });

  it('reports metering with the resolved conversation id when continuing by origin', async () => {
    const origin = {
      external_conversation_id: 'team:T123/channel:C123/thread:callback-continuation',
    };
    const conversation = createEmptyConversation({
      id: 'conversation-from-origin',
      title: 'Existing conversation',
      agent_id: 'test-agent',
      origin,
    });
    const conversationClient = createConversationClientMock();
    conversationClient.get.mockResolvedValue(conversation);
    conversationClient.update.mockResolvedValue(conversation);

    const roundCompleteEvent: ChatEvent = {
      type: ChatEventType.roundComplete,
      data: {
        round: createRound({}),
      },
    };
    executeAgentMock.mockReturnValue(of(roundCompleteEvent));
    resolveServicesMock.mockResolvedValue({
      conversationClient,
      selectedConnectorId: 'connector-1',
      modelProvider: createModelProviderMock(),
    } as never);

    const reportExecution = jest.fn().mockResolvedValue(undefined);
    const agentRegistry = {
      get: jest.fn().mockResolvedValue({ name: 'Test agent' }),
    };

    const execution = {
      executionId: 'execution-1',
      executionMode: AgentExecutionMode.conversation,
      owner: { id: 'owner-1', username: 'owner' },
      agentParams: {
        agentId: 'test-agent',
        conversationId: 'conversation-from-origin',
        conversationOperation: 'UPDATE',
        receivedAt: '2024-01-01T00:00:00.000Z',
        roundId: 'round-1',
        origin,
        nextInput: {
          message: 'Continue this thread',
        },
      },
    } as never;

    const events$ = await handleAgentExecution({
      execution,
      deps: {
        logger: loggingSystemMock.createLogger(),
        runAgent: jest.fn(),
        agentService: {
          getRegistry: jest.fn().mockResolvedValue(agentRegistry),
        },
        meteringService: {
          reportExecution,
        },
        conversationService: {
          getScopedClientAsUser: jest.fn().mockResolvedValue(conversationClient),
        },
        uiSettings: {
          asScopedToClient: jest.fn().mockReturnValue({}),
        },
        savedObjects: {
          getScopedClient: jest.fn().mockReturnValue({}),
        },
      } as never,
      request: { headers: {} } as never,
      abortSignal: new AbortController().signal,
    });

    await lastValueFrom(events$.pipe(toArray()));

    expect(reportExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-from-origin',
      })
    );
  });

  it('rejects a record written before the conversation was resolved on the request node', async () => {
    const conversationClient = createConversationClientMock();
    stubResolveServices(conversationClient);

    await expect(
      runHandle({
        agentParams: {
          agentId: 'test-agent',
          conversationId: undefined,
          roundId: undefined,
          conversationOperation: undefined,
          nextInput: { message: 'Hello' },
        },
        conversationClient,
      })
    ).rejects.toThrow('Execution is missing required conversation parameters');

    // Nothing is written for a record it cannot run, so the request can simply be sent again.
    expect(conversationClient.get).not.toHaveBeenCalled();
    expect(conversationClient.create).not.toHaveBeenCalled();
    expect(conversationClient.appendEvents).not.toHaveBeenCalled();
  });

  it('rejects a record that does not say who it runs for', async () => {
    const conversationClient = createConversationClientMock();
    stubResolveServices(conversationClient);

    await expect(
      handleAgentExecution({
        execution: {
          executionId: 'execution-1',
          executionMode: AgentExecutionMode.conversation,
          agentParams: {
            agentId: 'test-agent',
            conversationId: 'conversation-1',
            roundId: 'round-1',
            conversationOperation: 'UPDATE',
            receivedAt: '2024-01-01T00:00:00.000Z',
            nextInput: { message: 'Hello' },
          },
        } as never,
        deps: createDeps({ conversationClient }),
        request: { headers: {} } as never,
        abortSignal: new AbortController().signal,
      })
    ).rejects.toThrow('Execution is missing required conversation parameters');
  });

  it('acts as the recorded owner, without their admin rights', async () => {
    const conversation = createEmptyConversation({
      id: 'conversation-1',
      agent_id: 'test-agent',
    });
    const conversationClient = createConversationClientMock();
    conversationClient.get.mockResolvedValue(conversation);
    conversationClient.replaceRoundEvents.mockResolvedValue(conversation);
    mockAgentStream([makeRoundStartedEvent(), makeRoundCompleteEvent()]);
    stubResolveServices(conversationClient);

    const deps = createDeps({ conversationClient });
    const events$ = await handleAgentExecution({
      execution: {
        executionId: 'execution-1',
        executionMode: AgentExecutionMode.conversation,
        owner: { id: 'profile-alice', username: 'alice' },
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'conversation-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
          nextInput: { message: 'Hello' },
        },
      } as never,
      deps,
      request: { headers: {} } as never,
      abortSignal: new AbortController().signal,
    });
    await lastValueFrom(events$.pipe(toArray()));

    expect(
      (deps as unknown as { conversationService: { getScopedClientAsUser: jest.Mock } })
        .conversationService.getScopedClientAsUser
    ).toHaveBeenCalledWith({
      request: { headers: {} },
      user: { id: 'profile-alice', username: 'alice', isAdmin: false },
    });
  });

  describe('round origin attribution', () => {
    const originAuthor = { id: 'U123', full_name: 'Jane Doe', username: 'jane' };
    const origin = {
      type: ConversationOriginType.Slack,
      external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      author: originAuthor,
    };

    const setup = ({ roundCompleteEvent }: { roundCompleteEvent: RoundCompleteEvent }) => {
      const conversation = createEmptyConversation({
        id: 'conversation-from-origin',
        agent_id: 'test-agent',
        origin: { external_conversation_id: origin.external_conversation_id },
      });
      const conversationClient = createConversationClientMock();
      conversationClient.get.mockResolvedValue(conversation);
      conversationClient.getByOrigin.mockResolvedValue(conversation);
      conversationClient.update.mockResolvedValue(conversation);

      executeAgentMock.mockReturnValue(of(roundCompleteEvent));
      resolveServicesMock.mockResolvedValue({
        conversationClient,
        selectedConnectorId: 'connector-1',
        modelProvider: createModelProviderMock(),
      } as never);

      const deps = createDeps({ conversationClient });

      return { conversationClient, deps };
    };

    const runExecution = async ({
      deps,
      executionOrigin,
    }: {
      deps: unknown;
      executionOrigin?: typeof origin;
    }) => {
      const events$ = await handleAgentExecution({
        execution: {
          executionId: 'execution-1',
          executionMode: AgentExecutionMode.conversation,
          owner: { id: 'owner-1', username: 'owner' },
          agentParams: {
            agentId: 'test-agent',
            origin: executionOrigin,
            conversationId: 'conversation-from-origin',
            conversationOperation: 'UPDATE',
            receivedAt: '2024-01-01T00:00:00.000Z',
            roundId: 'round-1',
            nextInput: { message: 'Continue this thread' },
          },
        } as never,
        deps: deps as never,
        request: { headers: {} } as never,
        abortSignal: new AbortController().signal,
      });

      return lastValueFrom(events$.pipe(toArray()));
    };

    it('reads the conversation the service resolved and forwards the full origin to the agent run', async () => {
      const { conversationClient, deps } = setup({
        roundCompleteEvent: {
          type: ChatEventType.roundComplete,
          data: { round: createRound({}) },
        },
      });

      await runExecution({ deps, executionOrigin: origin });

      expect(conversationClient.get).toHaveBeenCalledWith('conversation-from-origin');
      expect(conversationClient.getByOrigin).not.toHaveBeenCalled();
      expect(executeAgentMock).toHaveBeenCalledWith(expect.objectContaining({ origin }));
    });
  });

  describe('round author attribution', () => {
    it('attributes the round to the user the execution was created for', async () => {
      const author = { id: 'test-user-id', username: 'test_user' };
      const conversation = createEmptyConversation({
        id: 'conversation-1',
        agent_id: 'test-agent',
      });
      const conversationClient = createConversationClientMock();
      conversationClient.get.mockResolvedValue(conversation);
      conversationClient.update.mockResolvedValue(conversation);
      conversationClient.getAuthor.mockReturnValue(author);

      executeAgentMock.mockReturnValue(
        of({
          type: ChatEventType.roundComplete,
          data: { round: createRound({}) },
        } as RoundCompleteEvent)
      );
      resolveServicesMock.mockResolvedValue({
        conversationClient,
        selectedConnectorId: 'connector-1',
        modelProvider: createModelProviderMock(),
      } as never);

      const deps = createDeps({ conversationClient });

      const events$ = await handleAgentExecution({
        execution: {
          executionId: 'execution-1',
          executionMode: AgentExecutionMode.conversation,
          owner: author,
          agentParams: {
            agentId: 'test-agent',
            conversationId: 'conversation-1',
            roundId: 'round-1',
            conversationOperation: 'UPDATE',
            receivedAt: '2024-01-01T00:00:00.000Z',
            nextInput: { message: 'Hello' },
          },
        } as never,
        deps,
        request: { headers: {} } as never,
        abortSignal: new AbortController().signal,
      });

      await lastValueFrom(events$.pipe(toArray()));

      expect(executeAgentMock).toHaveBeenCalledWith(expect.objectContaining({ author }));
    });
  });

  describe('converse span user identity', () => {
    it('sets the round author on the span for public UPDATE', async () => {
      const author = { id: 'author-id', username: 'author' };
      const conversation = createEmptyConversation({
        id: 'conversation-1',
        agent_id: 'test-agent',
        user: { id: 'owner-id', username: 'owner' },
      });
      const conversationClient = createConversationClientMock();
      conversationClient.get.mockResolvedValue(conversation);
      conversationClient.update.mockResolvedValue(conversation);
      conversationClient.getAuthor.mockReturnValue(author);

      executeAgentMock.mockReturnValue(
        of({
          type: ChatEventType.roundComplete,
          data: { round: createRound({}) },
        } as RoundCompleteEvent)
      );
      resolveServicesMock.mockResolvedValue({
        conversationClient,
        selectedConnectorId: 'connector-1',
        modelProvider: createModelProviderMock(),
      } as never);

      const events$ = await handleAgentExecution({
        execution: {
          executionId: 'execution-1',
          executionMode: AgentExecutionMode.conversation,
          owner: author,
          agentParams: {
            agentId: 'test-agent',
            conversationId: 'conversation-1',
            roundId: 'round-1',
            conversationOperation: 'UPDATE',
            receivedAt: '2024-01-01T00:00:00.000Z',
            nextInput: { message: 'Hello' },
          },
        } as never,
        deps: createDeps({ conversationClient }),
        request: { headers: {} } as never,
        abortSignal: new AbortController().signal,
      });

      await lastValueFrom(events$.pipe(toArray()));

      expect(withConverseSpanMock).toHaveBeenCalled();
      expect(mockSpanSetAttribute).toHaveBeenCalledWith(UserAttributes.UserId, 'author-id');
      expect(mockSpanSetAttribute).toHaveBeenCalledWith(UserAttributes.UserName, 'author');
      expect(mockSpanSetAttribute).not.toHaveBeenCalledWith(UserAttributes.UserId, 'owner-id');
    });

    it('reports the stored owner of a conversation this request created', async () => {
      const createdUser = { id: 'created-user-id', username: 'created_user' };
      const createdConversation = createEmptyConversation({
        id: 'new-conversation',
        agent_id: 'test-agent',
        user: createdUser,
      });
      const conversationClient = createConversationClientMock();
      conversationClient.get.mockResolvedValue(createdConversation);
      conversationClient.appendEvents.mockResolvedValue(createdConversation);
      conversationClient.replaceRoundEvents.mockResolvedValue(createdConversation);

      mockAgentStream([makeRoundStartedEvent(), makeRoundCompleteEvent()]);
      stubResolveServices(conversationClient);

      const events$ = await handleAgentExecution({
        execution: {
          executionId: 'execution-1',
          executionMode: AgentExecutionMode.conversation,
          // an API key caller with no profile id: the round carries no author
          owner: { username: 'created_user' },
          agentParams: {
            agentId: 'test-agent',
            conversationId: 'new-conversation',
            roundId: 'round-1',
            conversationOperation: 'CREATE',
            receivedAt: '2024-01-01T00:00:00.000Z',
            nextInput: { message: 'Hello' },
          },
        } as never,
        deps: createDeps({ conversationClient }),
        request: { headers: {} } as never,
        abortSignal: new AbortController().signal,
      });

      await lastValueFrom(events$.pipe(toArray()));

      expect(mockSpanSetAttribute).not.toHaveBeenCalledWith(UserAttributes.UserId, 'unknown');
      expect(mockSpanSetAttribute).not.toHaveBeenCalledWith(UserAttributes.UserName, 'unknown');
      expect(mockSpanSetAttribute).toHaveBeenCalledWith(UserAttributes.UserId, 'created-user-id');
      expect(mockSpanSetAttribute).toHaveBeenCalledWith(UserAttributes.UserName, 'created_user');
    });

    it('reports no identity for a run whose conversation is never stored', async () => {
      const conversationClient = createConversationClientMock();
      mockAgentStream([makeRoundStartedEvent(), makeRoundCompleteEvent()]);
      stubResolveServices(conversationClient);

      const events$ = await runHandle({
        agentParams: {
          agentId: 'test-agent',
          nextInput: { message: 'Hello' },
          storeConversation: false,
        },
        conversationClient,
      });

      await lastValueFrom(events$.pipe(toArray()));

      // The placeholder owner is nobody, and no write will ever resolve one.
      expect(mockSpanSetAttribute).not.toHaveBeenCalledWith(UserAttributes.UserId, 'unknown');
      expect(mockSpanSetAttribute).not.toHaveBeenCalledWith(UserAttributes.UserName, 'unknown');
    });
  });

  describe('SSE execution_started projection', () => {
    it('emits execution_started at round start (before execution_terminated) on the normal path', async () => {
      const conversation = createEmptyConversation({
        id: 'conversation-1',
        agent_id: 'test-agent',
      });
      const conversationClient = createConversationClientMock();
      conversationClient.get.mockResolvedValue(conversation);
      conversationClient.appendEvents.mockResolvedValue(conversation);
      conversationClient.replaceRoundEvents.mockResolvedValue(conversation);

      mockAgentStream(
        [
          makeRoundStartedEvent('round-1', { started_at: '2024-01-01T00:00:00.000Z' }),
          {
            type: ChatEventType.roundComplete,
            data: {
              round: createRound({
                id: 'round-1',
                status: ConversationRoundStatus.completed,
              }),
            },
          } as RoundCompleteEvent,
        ],
        'asyncShared'
      );
      stubResolveServices(conversationClient);

      const events$ = await runHandle({
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'conversation-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
          nextInput: { message: 'Hello' },
        },
        conversationClient,
      });

      const emitted = (await lastValueFrom(events$.pipe(toArray()))) as ChatEvent[];
      const startedIndex = emitted.findIndex(
        (event) => event.type === TimelineEventType.executionStarted
      );
      const terminatedIndex = emitted.findIndex(
        (event) => event.type === TimelineEventType.executionTerminated
      );

      expect(startedIndex).toBeGreaterThanOrEqual(0);
      expect(terminatedIndex).toBeGreaterThan(startedIndex);
      expect(emitted[startedIndex]).toMatchObject({
        id: 'round-1::execution_started',
        created_at: '2024-01-01T00:00:00.000Z',
        execution_id: 'round-1::execution',
        trigger_event_id: 'round-1::user_message',
      });
    });

    it('resolves a placeholder when the run does not store its conversation', async () => {
      const conversationClient = createConversationClientMock();
      mockAgentStream(
        [makeRoundStartedEvent('round-1'), makeRoundCompleteEvent('round-1')],
        'asyncShared'
      );
      stubResolveServices(conversationClient);

      const events$ = await runHandle({
        agentParams: {
          agentId: 'test-agent',
          nextInput: { message: 'Hello' },
          storeConversation: false,
        },
        conversationClient,
      });

      await lastValueFrom(events$.pipe(toArray()));

      // Nothing was written for this run, so there is no stored document to read back.
      expect(conversationClient.get).not.toHaveBeenCalled();
      expect(conversationClient.create).not.toHaveBeenCalled();
      expect(executeAgentMock).toHaveBeenCalledWith(
        expect.objectContaining({ conversation: expect.objectContaining({ operation: 'CREATE' }) })
      );
    });

    it('skips the SSE projection when storeConversation is false (async path only)', async () => {
      const conversationClient = createConversationClientMock();
      mockAgentStream(
        [makeRoundStartedEvent('round-1'), makeRoundCompleteEvent('round-1')],
        'asyncShared'
      );
      stubResolveServices(conversationClient);

      const events$ = await runHandle({
        agentParams: {
          agentId: 'test-agent',
          nextInput: { message: 'Hello' },
          storeConversation: false,
        },
        conversationClient,
      });

      const emitted = (await lastValueFrom(events$.pipe(toArray()))) as ChatEvent[];
      expect(emitted.some((event) => event.type === TimelineEventType.executionStarted)).toBe(
        false
      );
    });
  });

  describe('two-phase failure handling', () => {
    it('keeps the receipt-time user_message on UPDATE when the run fails after round start and records the failed execution', async () => {
      const conversation = createEmptyConversation({
        id: 'conversation-1',
        agent_id: 'test-agent',
      });
      const conversationClient = createConversationClientMock();
      conversationClient.get.mockResolvedValue(conversation);
      conversationClient.appendEvents.mockResolvedValue(conversation);
      conversationClient.replaceRoundEvents.mockResolvedValue(conversation);

      mockAgentStream([makeRoundStartedEvent()], 'asyncShared', new Error('agent exploded'));
      stubResolveServices(conversationClient);

      const events$ = await runHandle({
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'conversation-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
          nextInput: { message: 'Hello' },
        },
        conversationClient,
      });

      await expect(lastValueFrom(events$.pipe(toArray()))).rejects.toThrow();
      await flushMicrotasks();

      // The message was written before the run started, so the failure only rewrites the round.
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
      expect(conversationClient.replaceRoundEvents).toHaveBeenCalledTimes(1);
      expect(conversationClient.replaceRoundEvents.mock.calls[0][0].roundId).toBe('round-1');
      expect(conversationClient.delete).not.toHaveBeenCalled();
    });

    it('keeps the conversation on CREATE when the first round fails before completing', async () => {
      const conversationClient = createConversationClientMock();
      conversationClient.get.mockResolvedValue(createEmptyConversation({ id: 'new-conversation' }));
      conversationClient.appendEvents.mockResolvedValue(
        createEmptyConversation({ id: 'new-conversation' })
      );

      mockAgentStream([makeRoundStartedEvent()], 'asyncShared', new Error('agent exploded'));
      stubResolveServices(conversationClient);

      const events$ = await runHandle({
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'new-conversation',
          conversationOperation: 'CREATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
          nextInput: { message: 'Hello' },
        },
        conversationClient,
      });

      await expect(lastValueFrom(events$.pipe(toArray()))).rejects.toThrow();
      await flushMicrotasks();

      // The conversation and its receipt-time user_message survive the failed round; the failure
      // is recorded on it.
      expect(conversationClient.delete).not.toHaveBeenCalled();
      expect(conversationClient.replaceRoundEvents).toHaveBeenCalledTimes(1);
    });
  });
});

describe('handleAgentExecution — interrupted executions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateTitleMock.mockReturnValue(of('Generated title'));
  });

  const makeRoundInterruptedEvent = (roundId: string = 'round-1'): RoundInterruptedEvent => ({
    type: ChatEventType.roundInterrupted,
    data: {
      round_id: roundId,
      started_at: '2024-01-01T00:00:00.000Z',
      input: { message: 'Hello' },
      steps: [],
      summary: { time_to_last_token: 1 },
      attachments: [],
    },
  });

  /** A client whose events writes echo the written events (a landed write). */
  const echoingClient = () => {
    const conversation = createEmptyConversation({ id: 'conversation-1', agent_id: 'test-agent' });
    const conversationClient = createConversationClientMock();
    conversationClient.get.mockResolvedValue(conversation);
    conversationClient.appendEvents.mockImplementation(async (request) => ({
      ...conversation,
      schema_version: 1,
      events: request.events,
    }));
    conversationClient.replaceRoundEvents.mockImplementation(async (request) => ({
      ...conversation,
      schema_version: 1,
      events: request.events,
    }));
    return conversationClient;
  };

  const collect = async (events$: Observable<ChatEvent>) => {
    const seen: ChatEvent[] = [];
    let thrown: unknown;
    try {
      await lastValueFrom(
        events$.pipe(
          tap((event) => seen.push(event)),
          toArray()
        )
      );
    } catch (err) {
      thrown = err;
    }
    await flushMicrotasks();
    return { seen, thrown };
  };

  it('failure mid-round: persists execution_failed, emits it on the stream, then errors with the same error', async () => {
    const conversationClient = echoingClient();
    mockAgentStream(
      [makeRoundStartedEvent(), makeRoundInterruptedEvent()],
      'asyncShared',
      new Error('llm exploded')
    );
    stubResolveServices(conversationClient);

    const events$ = await runHandle({
      agentParams: {
        agentId: 'test-agent',
        conversationId: 'conversation-1',
        roundId: 'round-1',
        conversationOperation: 'UPDATE',
        receivedAt: '2024-01-01T00:00:00.000Z',
        nextInput: { message: 'Hello' },
      },
      conversationClient,
    });
    const { seen, thrown } = await collect(events$);

    expect(thrown).toMatchObject({
      code: AgentBuilderErrorCode.internalError,
      message: 'Error executing agent: llm exploded',
    });
    expect(seen.map((event) => event.type)).toEqual([
      TimelineEventType.executionStarted,
      TimelineEventType.executionFailed,
    ]);
    expect(conversationClient.replaceRoundEvents).toHaveBeenCalledTimes(1);
    const [write] = conversationClient.replaceRoundEvents.mock.calls[0];
    expect(write.skipIfTerminalExistsFor).toBe('round-1::execution');
    const stored = write.events.at(-1)!;
    expect(stored.type).toBe(TimelineEventType.executionFailed);
    // the stored error is the one the client receives
    expect((stored.data as { error: { message: string } }).error.message).toBe(
      'Error executing agent: llm exploded'
    );
    expect(seen.map((event) => event.type)).not.toContain(ChatEventType.roundInterrupted);
  });

  it('abort mid-round: emits execution_aborted and errors with RequestAbortedError', async () => {
    const conversationClient = echoingClient();
    const abortController = new AbortController();
    // the agent stream emits round_started, then aborts and winds down with round_interrupted
    const source$ = new Subject<ChatAgentEvent>();
    executeAgentMock.mockReturnValue(source$.pipe(shareReplay()));
    stubResolveServices(conversationClient);

    const events$ = await handleAgentExecution({
      execution: {
        executionId: 'execution-1',
        executionMode: AgentExecutionMode.conversation,
        owner: { id: 'owner-1', username: 'owner' },
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'conversation-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
          nextInput: { message: 'Hello' },
        },
      } as never,
      deps: createDeps({ conversationClient }),
      request: { headers: {} } as never,
      abortSignal: abortController.signal,
    });
    const collected = collect(events$);
    await flushMicrotasks();
    source$.next(makeRoundStartedEvent());
    abortController.abort();
    source$.next(makeRoundInterruptedEvent());
    source$.error(new Error('AbortError'));
    const { seen, thrown } = await collected;

    expect(isRequestAbortedError(thrown)).toBe(true);
    expect(seen.map((event) => event.type)).toEqual([
      TimelineEventType.executionStarted,
      TimelineEventType.executionAborted,
    ]);
    const [write] = conversationClient.replaceRoundEvents.mock.calls[0];
    expect(write.events.at(-1)!.type).toBe(TimelineEventType.executionAborted);
  });

  it('late abort after round_complete: only the success write happens', async () => {
    const conversationClient = echoingClient();
    const abortController = new AbortController();
    const source$ = new Subject<ChatAgentEvent>();
    executeAgentMock.mockReturnValue(source$.pipe(shareReplay()));
    stubResolveServices(conversationClient);

    const events$ = await handleAgentExecution({
      execution: {
        executionId: 'execution-1',
        executionMode: AgentExecutionMode.conversation,
        owner: { id: 'owner-1', username: 'owner' },
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'conversation-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
          nextInput: { message: 'Hello' },
        },
      } as never,
      deps: createDeps({ conversationClient }),
      request: { headers: {} } as never,
      abortSignal: abortController.signal,
    });
    const collected = collect(events$);
    await flushMicrotasks();
    source$.next(makeRoundStartedEvent());
    source$.next({
      type: ChatEventType.roundComplete,
      data: { round: createRound({ id: 'round-1', status: ConversationRoundStatus.completed }) },
    } as RoundCompleteEvent);
    abortController.abort();
    source$.complete();
    const { seen, thrown } = await collected;

    expect(isRequestAbortedError(thrown)).toBe(true);
    // one write: the success path's replaceRoundEvents; no interruption write on top of it
    expect(conversationClient.replaceRoundEvents).toHaveBeenCalledTimes(1);
    expect(conversationClient.replaceRoundEvents.mock.calls[0][0]).not.toHaveProperty(
      'skipIfTerminalExistsFor'
    );
    expect(seen.map((event) => event.type)).toContain(TimelineEventType.executionTerminated);
    expect(seen.map((event) => event.type)).not.toContain(TimelineEventType.executionAborted);
  });

  it('success write fails: execution_failed is written from the round_complete payload', async () => {
    const conversationClient = echoingClient();
    const conversation = createEmptyConversation({ id: 'conversation-1', agent_id: 'test-agent' });
    conversationClient.replaceRoundEvents
      .mockRejectedValueOnce(new Error('store down'))
      .mockImplementationOnce(async (request) => ({
        ...conversation,
        schema_version: 1,
        events: request.events,
      }));
    mockAgentStream(
      [
        makeRoundStartedEvent(),
        {
          type: ChatEventType.roundComplete,
          data: {
            round: {
              ...createRound({ id: 'round-1', status: ConversationRoundStatus.completed }),
              steps: [{ type: 'reasoning', reasoning: 'r' } as never],
            },
          },
        } as RoundCompleteEvent,
      ],
      'asyncShared'
    );
    stubResolveServices(conversationClient);

    const events$ = await runHandle({
      agentParams: {
        agentId: 'test-agent',
        conversationId: 'conversation-1',
        roundId: 'round-1',
        conversationOperation: 'UPDATE',
        receivedAt: '2024-01-01T00:00:00.000Z',
        nextInput: { message: 'Hello' },
      },
      conversationClient,
    });
    const { seen, thrown } = await collect(events$);

    expect(thrown).toMatchObject({ message: 'Error executing agent: store down' });
    expect(conversationClient.replaceRoundEvents).toHaveBeenCalledTimes(2);
    const [interruptionWrite] = conversationClient.replaceRoundEvents.mock.calls[1];
    expect(interruptionWrite.skipIfTerminalExistsFor).toBe('round-1::execution');
    expect(interruptionWrite.events.map((event) => event.id)).toEqual([
      'round-1::user_message',
      'round-1::execution_started',
      'round-1::step::0',
      'round-1::execution_failed',
    ]);
    expect(seen.map((event) => event.type)).toContain(TimelineEventType.executionFailed);
  });

  it('a service/connector resolution failure is caught by the same guard as a later setup failure', async () => {
    // resolveServices runs first in the runner, before the agent registry lookup covered above:
    // it must be inside the same guard, or a rejection here leaves the receipt-time message with
    // no failure terminal next to it.
    const conversationClient = echoingClient();
    mockAgentStream([makeRoundStartedEvent(), makeRoundCompleteEvent()], 'asyncShared');
    resolveServicesMock.mockRejectedValue(new Error('no connector available'));
    const deps = createDeps({ conversationClient });

    const events$ = await handleAgentExecution({
      execution: {
        executionId: 'execution-1',
        executionMode: AgentExecutionMode.conversation,
        owner: { id: 'owner-1', username: 'owner' },
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'conversation-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
          nextInput: { message: 'Hello' },
        },
      } as never,
      deps: deps as never,
      request: { headers: {} } as never,
      abortSignal: new AbortController().signal,
    });
    const { seen, thrown } = await collect(events$);

    expect(seen.map((event) => event.type)).toEqual([TimelineEventType.executionFailed]);
    expect(thrown).toMatchObject({
      code: AgentBuilderErrorCode.internalError,
      message: 'Error executing agent: no connector available',
    });

    expect(conversationClient.replaceRoundEvents).toHaveBeenCalledTimes(1);
    const [write] = conversationClient.replaceRoundEvents.mock.calls[0];
    expect(write.events.map((event) => event.id)).toEqual([
      'round-1::user_message',
      'round-1::execution_started',
      'round-1::execution_failed',
    ]);
  });

  it('setup failure after the receipt write: minimal execution_failed persisted, streamed, then the normalised error', async () => {
    const conversationClient = echoingClient();
    mockAgentStream([makeRoundStartedEvent(), makeRoundCompleteEvent()], 'asyncShared');
    stubResolveServices(conversationClient);
    const deps = createDeps({ conversationClient }) as { agentService: { getRegistry: jest.Mock } };
    deps.agentService.getRegistry.mockRejectedValue(new Error('registry down'));

    const events$ = await handleAgentExecution({
      execution: {
        executionId: 'execution-1',
        executionMode: AgentExecutionMode.conversation,
        owner: { id: 'owner-1', username: 'owner' },
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'conversation-1',
          // The execution service opens the round and writes its message before dispatching.
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
          nextInput: { message: 'Hello' },
        },
      } as never,
      deps: deps as never,
      request: { headers: {} } as never,
      abortSignal: new AbortController().signal,
    });
    const { seen, thrown } = await collect(events$);

    // the persisted terminal reaches the stream before the error, like a mid-run failure
    expect(seen.map((event) => event.type)).toEqual([TimelineEventType.executionFailed]);
    expect(thrown).toMatchObject({
      code: AgentBuilderErrorCode.internalError,
      message: 'Error executing agent: registry down',
    });

    // only the minimal interruption projection: the message was written before the run
    expect(conversationClient.appendEvents).not.toHaveBeenCalled();
    expect(conversationClient.replaceRoundEvents).toHaveBeenCalledTimes(1);
    const [write] = conversationClient.replaceRoundEvents.mock.calls[0];
    expect(write.events.map((event) => event.id)).toEqual([
      'round-1::user_message',
      'round-1::execution_started',
      'round-1::execution_failed',
    ]);
    // the rebuilt message keeps the receipt time, not the time this run picked the record up
    expect(write.events[0].created_at).toBe('2024-01-01T00:00:00.000Z');
  });

  it('setup-time abort carries the recorded abort reason into execution_aborted', async () => {
    const conversationClient = echoingClient();
    mockAgentStream([makeRoundStartedEvent(), makeRoundCompleteEvent()], 'asyncShared');
    stubResolveServices(conversationClient);
    const deps = createDeps({ conversationClient }) as { agentService: { getRegistry: jest.Mock } };
    const abortController = new AbortController();
    deps.agentService.getRegistry.mockImplementation(async () => {
      abortController.abort({ source: 'api', actor: { id: 'u1', username: 'alice' } });
      throw new Error('AbortError');
    });

    const events$ = await handleAgentExecution({
      execution: {
        executionId: 'execution-1',
        executionMode: AgentExecutionMode.conversation,
        owner: { id: 'owner-1', username: 'owner' },
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'conversation-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
          nextInput: { message: 'Hello' },
        },
      } as never,
      deps: deps as never,
      request: { headers: {} } as never,
      abortSignal: abortController.signal,
    });
    const { seen, thrown } = await collect(events$);

    expect(isRequestAbortedError(thrown)).toBe(true);
    expect(seen.map((event) => event.type)).toEqual([TimelineEventType.executionAborted]);
    const [write] = conversationClient.replaceRoundEvents.mock.calls[0];
    expect(write.events.at(-1)!.data).toMatchObject({
      aborted_by: { source: 'api', actor: { id: 'u1', username: 'alice' } },
    });
  });

  it('setup failure on a HITL resume: prompt_response + minimal exec_k projection appended', async () => {
    const conversationClient = echoingClient();
    const paused = {
      ...createEmptyConversation({ id: 'conversation-1', agent_id: 'test-agent' }),
      rounds: [createRound({ id: 'round-1', status: ConversationRoundStatus.awaitingPrompt })],
      events: [
        {
          id: 'round-1::execution_terminated',
          type: TimelineEventType.executionTerminated,
          created_at: '2024-01-01T00:00:00.000Z',
          actor: { type: 'agent', id: 'test-agent' },
          execution_id: 'round-1::execution',
          trigger_event_id: 'round-1::user_message',
          data: {
            model_usage: { connector_id: 'c', llm_calls: 1, input_tokens: 1, output_tokens: 1 },
            time_to_first_token: 1,
            time_to_last_token: 1,
            outcome: { type: 'prompt_requested', prompts: [] },
          },
        },
      ] as never,
    };
    conversationClient.get.mockResolvedValue(paused);
    stubResolveServices(conversationClient);
    const deps = createDeps({ conversationClient }) as { agentService: { getRegistry: jest.Mock } };
    deps.agentService.getRegistry.mockRejectedValue(new Error('registry down'));

    const events$ = await handleAgentExecution({
      execution: {
        executionId: 'execution-1',
        executionMode: AgentExecutionMode.conversation,
        owner: { id: 'owner-1', username: 'owner' },
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'conversation-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
          nextInput: { prompts: {} },
        },
      } as never,
      deps: deps as never,
      request: { headers: {} } as never,
      abortSignal: new AbortController().signal,
    });
    const { seen, thrown } = await collect(events$);
    expect(thrown).toBeDefined();
    expect(seen.map((event) => event.type)).toEqual([TimelineEventType.executionFailed]);

    // no receipt write on a resume; one append with the prompt_response and the exec_1 projection
    expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
    const [write] = conversationClient.appendEvents.mock.calls[0];
    expect(write.events.map((event) => event.id)).toEqual([
      'round-1::prompt_response::1',
      'round-1::execution::1::execution_started',
      'round-1::execution::1::execution_failed',
    ]);
    // the interrupted resume consumed the prompt: the round no longer awaits it
    expect(write.status).toBe(ConversationRoundStatus.completed);
  });

  it('failure on a HITL resume: the round error keeps the paused round origin the request omits', async () => {
    const conversationClient = echoingClient();
    const paused = {
      ...createEmptyConversation({ id: 'conversation-1', agent_id: 'test-agent' }),
      rounds: [
        createRound({
          id: 'round-1',
          status: ConversationRoundStatus.awaitingPrompt,
          origin: { type: ConversationOriginType.Slack },
        }),
      ],
    };
    conversationClient.get.mockResolvedValue(paused);
    stubResolveServices(conversationClient);
    mockAgentStream([makeRoundInterruptedEvent()], 'asyncShared', new Error('llm exploded'));

    const reportRoundError = jest.fn();
    const deps = createDeps({ conversationClient, analyticsService: { reportRoundError } });

    const events$ = await handleAgentExecution({
      execution: {
        executionId: 'execution-1',
        executionMode: AgentExecutionMode.conversation,
        owner: { id: 'owner-1', username: 'owner' },
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'conversation-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
          nextInput: { prompts: {} },
        },
      } as never,
      deps: deps as never,
      request: { headers: {} } as never,
      abortSignal: new AbortController().signal,
    });
    const { thrown } = await collect(events$);

    expect(thrown).toMatchObject({ code: AgentBuilderErrorCode.internalError });
    expect(reportRoundError).toHaveBeenCalledWith(
      expect.objectContaining({ roundOrigin: ConversationOriginType.Slack })
    );
  });

  it('failure on a fresh round: a completed round origin is not carried over to the new round', async () => {
    const conversationClient = echoingClient();
    const slackConversation = {
      ...createEmptyConversation({ id: 'conversation-1', agent_id: 'test-agent' }),
      rounds: [
        createRound({
          id: 'round-1',
          status: ConversationRoundStatus.completed,
          origin: { type: ConversationOriginType.Slack },
        }),
      ],
    };
    conversationClient.get.mockResolvedValue(slackConversation);
    stubResolveServices(conversationClient);
    mockAgentStream(
      [makeRoundStartedEvent(), makeRoundInterruptedEvent()],
      'asyncShared',
      new Error('llm exploded')
    );

    const reportRoundError = jest.fn();
    const deps = createDeps({ conversationClient, analyticsService: { reportRoundError } });

    const events$ = await handleAgentExecution({
      execution: {
        executionId: 'execution-1',
        executionMode: AgentExecutionMode.conversation,
        owner: { id: 'owner-1', username: 'owner' },
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'conversation-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
          nextInput: { message: 'Hello' },
        },
      } as never,
      deps: deps as never,
      request: { headers: {} } as never,
      abortSignal: new AbortController().signal,
    });
    await collect(events$);

    expect(reportRoundError).toHaveBeenCalledWith(
      expect.objectContaining({ roundOrigin: undefined })
    );
  });

  it('storeConversation=false: nothing is written and the error surfaces unchanged in kind', async () => {
    const conversationClient = createConversationClientMock();
    mockAgentStream(
      [makeRoundStartedEvent(), makeRoundInterruptedEvent()],
      'asyncShared',
      new Error('llm exploded')
    );
    stubResolveServices(conversationClient);

    const events$ = await runHandle({
      agentParams: {
        agentId: 'test-agent',
        nextInput: { message: 'Hello' },
        storeConversation: false,
      },
      conversationClient,
    });
    const { seen, thrown } = await collect(events$);

    expect(thrown).toMatchObject({ code: AgentBuilderErrorCode.internalError });
    expect(seen).toEqual([]);
    expect(conversationClient.appendEvents).not.toHaveBeenCalled();
    expect(conversationClient.replaceRoundEvents).not.toHaveBeenCalled();
  });
});

describe('collectAndWriteEvents — error flush', () => {
  it('flushes the pending batch before rejecting', async () => {
    const executionClient = { appendEvents: jest.fn().mockResolvedValue(undefined) };
    const source$ = new Subject<ChatEvent>();
    const failure = new Error('stream failed');

    const promise = collectAndWriteEvents({
      events$: source$,
      execution: { executionId: 'execution-1' } as never,
      executionClient: executionClient as never,
      logger: loggingSystemMock.createLogger(),
    });
    const terminal = {
      id: 'round-1::execution_failed',
      type: TimelineEventType.executionFailed,
    } as unknown as ChatEvent;
    source$.next(terminal);
    source$.error(failure);

    await expect(promise).rejects.toBe(failure);
    expect(executionClient.appendEvents).toHaveBeenCalledWith('execution-1', [terminal]);
  });
});

describe('setUserAttributes', () => {
  it('sets user.id and user.name when both are present', () => {
    const span = { setAttribute: jest.fn() } as unknown as Span;

    setUserAttributes(span, { id: 'profile-1', username: 'jane' });

    expect(span.setAttribute).toHaveBeenCalledWith(UserAttributes.UserId, 'profile-1');
    expect(span.setAttribute).toHaveBeenCalledWith(UserAttributes.UserName, 'jane');
  });

  it('sets only the fields that are present', () => {
    const span = { setAttribute: jest.fn() } as unknown as Span;

    setUserAttributes(span, { username: 'jane' });

    expect(span.setAttribute).toHaveBeenCalledTimes(1);
    expect(span.setAttribute).toHaveBeenCalledWith(UserAttributes.UserName, 'jane');
  });

  it('is a no-op when span is undefined', () => {
    expect(() => setUserAttributes(undefined, { id: 'profile-1', username: 'jane' })).not.toThrow();
  });
});

describe('collectAndWriteEvents', () => {
  const event: ChatEvent = {
    type: ChatEventType.conversationUpdated,
    data: {
      conversation_id: 'conversation-1',
      title: 'Conversation',
      access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
    },
  };

  const createExecutionClient = () => ({
    appendEvents: jest.fn().mockResolvedValue(undefined),
  });

  const execution = {
    executionId: 'execution-1',
  };

  it('appends the events to the execution document and resolves once flushed', async () => {
    const executionClient = createExecutionClient();

    await expect(
      collectAndWriteEvents({
        events$: of(event),
        execution: execution as never,
        executionClient: executionClient as never,
        logger: loggingSystemMock.createLogger(),
      })
    ).resolves.toBeUndefined();

    expect(executionClient.appendEvents).toHaveBeenCalledWith('execution-1', [event]);
  });
});
