/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, of, throwError } from 'rxjs';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { IBasePath } from '@kbn/core/server';
import { isomerPluginMock } from '@kbn/isomer-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  AgentExecutionMode,
  ChatEventType,
  ConversationOriginType,
  ExecutionStatus,
  TimelineEventType,
  type ChatCallbackEventResponse,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { AttachmentServiceStart } from '../../attachments';
import type { ConversationService } from '../../conversation';
import { SurfacesServiceImpl } from '../../surfaces';
import type { AgentExecutionClient } from '../persistence';
import type { CallbackDeliveryService } from './callback_delivery_service';
import { deliverPromptResolved } from './deliver_prompt_resolved';

const callbackUrl = 'https://callback.example.com/v1/events?token=abc';
const request = httpServerMock.createKibanaRequest();
const owner = { id: 'user-1', username: 'elastic' };
const prompt = { type: 'confirmation', id: 'prompt-1', message: 'Delete the index?' };

const createExecution = (overrides: Record<string, unknown> = {}): AgentExecution =>
  ({
    executionId: 'resume-1',
    executionMode: AgentExecutionMode.conversation,
    spaceId: 'space-1',
    agentId: 'agent-1',
    owner,
    agentParams: {
      conversationId: 'conversation-1',
      nextInput: { prompts: { 'prompt-1': { allow: true } } },
    },
    ...overrides,
  } as unknown as AgentExecution);

const pausedExecution = createExecution({
  executionId: 'paused-1',
  agentParams: {
    conversationId: 'conversation-1',
    nextInput: { message: 'Delete logs-old' },
    callback: { url: callbackUrl },
    origin: { type: ConversationOriginType.Slack, external_conversation_id: 'thread-1' },
  },
});

const pausedEvents = (outcome: unknown = { type: 'prompt_requested', prompts: [prompt] }) =>
  [
    {
      type: ChatEventType.roundComplete,
      data: { round: { id: 'round-1', response: { message: 'I need your approval.' } } },
    },
    { type: TimelineEventType.executionTerminated, data: { outcome } },
  ] as unknown as ChatEvent[];

const startedEvent = { type: ChatEventType.roundStarted, data: {} } as unknown as ChatEvent;

const setup = ({
  executions = [createExecution(), pausedExecution],
  events = pausedEvents(),
}: { executions?: AgentExecution[]; events?: ChatEvent[] } = {}) => {
  const executionClient = {
    find: jest.fn().mockResolvedValue(executions),
    readEvents: jest.fn().mockResolvedValue({ events, status: ExecutionStatus.completed }),
  } as unknown as jest.Mocked<AgentExecutionClient>;
  const callbackDeliveryService = {
    validateCallbackUrl: jest.fn(),
    makeCallbackRequest: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<CallbackDeliveryService>;
  const conversationClient = { get: jest.fn().mockResolvedValue({ id: 'conversation-1' }) };
  const logger = loggerMock.create();

  return {
    executionClient,
    callbackDeliveryService,
    logger,
    deps: {
      request,
      executionClient,
      callbackDeliveryService,
      conversationService: {
        getScopedClientAsUser: jest.fn().mockResolvedValue(conversationClient),
      } as unknown as ConversationService,
      surfacesService: new SurfacesServiceImpl({
        attachmentsService: { getTypeDefinition: jest.fn() } as unknown as AttachmentServiceStart,
        logger: loggerMock.create(),
        isomer: isomerPluginMock.createStartContract(),
        basePath: { publicBaseUrl: 'https://kibana.example.com' } as IBasePath,
        cloud: undefined,
      }),
      logger,
    },
  };
};

describe('deliverPromptResolved', () => {
  it('tells the paused execution’s callback that its prompts were answered', async () => {
    const { deps, executionClient, callbackDeliveryService } = setup();

    await deliverPromptResolved({
      execution: createExecution(),
      events$: of(startedEvent),
      ...deps,
    });

    expect(executionClient.find).toHaveBeenCalledWith({
      spaceId: 'space-1',
      filter: { conversationId: 'conversation-1' },
      size: 10,
    });
    expect(callbackDeliveryService.validateCallbackUrl).toHaveBeenCalledWith(callbackUrl);
    expect(callbackDeliveryService.makeCallbackRequest).toHaveBeenCalledTimes(1);

    const [{ payload, callbackUrl: deliveredTo, retry }] =
      callbackDeliveryService.makeCallbackRequest.mock.calls[0];
    const { event } = payload as ChatCallbackEventResponse;

    expect(deliveredTo).toBe(callbackUrl);
    expect(retry).toBe(true);
    expect(payload).toMatchObject({
      execution_id: 'paused-1',
      idempotency_key: 'paused-1:prompt_resolved',
    });
    expect(event).toMatchObject({
      type: 'prompt_resolved',
      data: { responses: { 'prompt-1': { allow: true } } },
    });
  });

  it('renders the answered prompts for the surface, without anything left to click', async () => {
    const { deps, callbackDeliveryService } = setup();

    await deliverPromptResolved({
      execution: createExecution(),
      events$: of(startedEvent),
      ...deps,
    });

    const [{ payload }] = callbackDeliveryService.makeCallbackRequest.mock.calls[0];
    const { event } = payload as ChatCallbackEventResponse;
    const surfacePayload = 'surface_payload' in event ? event.surface_payload : undefined;

    expect(surfacePayload?.text).toContain('I need your approval.');
    expect(surfacePayload?.text).toContain('Delete the index?');
    expect(surfacePayload?.text).toContain('Approve');
    expect(surfacePayload?.blocks.some(({ type }) => type === 'actions')).toBe(false);
  });

  it.each([
    ['is not a resume', createExecution({ agentParams: { conversationId: 'c', nextInput: {} } })],
    ['is standalone', createExecution({ executionMode: AgentExecutionMode.standalone })],
  ])('does nothing for an execution that %s', async (_, execution) => {
    const { deps, executionClient } = setup();

    await deliverPromptResolved({ execution, events$: of(startedEvent), ...deps });

    expect(executionClient.find).not.toHaveBeenCalled();
  });

  it.each([
    ['fails before it starts', throwError(() => new Error('boom'))],
    ['never starts', EMPTY],
  ])('does nothing when the run %s', async (_, events$) => {
    const { deps, executionClient } = setup();

    await deliverPromptResolved({ execution: createExecution(), events$, ...deps });

    expect(executionClient.find).not.toHaveBeenCalled();
  });

  it.each([
    ['there is no other execution', { executions: [createExecution()] }],
    [
      'the paused execution has no callback',
      { executions: [createExecution({ executionId: 'paused-1' })] },
    ],
    [
      'the latest execution did not ask the answered prompts',
      { events: pausedEvents({ type: 'responded', response: { message: 'Done' } }) },
    ],
  ])('delivers nothing when %s', async (_, options) => {
    const { deps, callbackDeliveryService } = setup(options);

    await deliverPromptResolved({
      execution: createExecution(),
      events$: of(startedEvent),
      ...deps,
    });

    expect(callbackDeliveryService.makeCallbackRequest).not.toHaveBeenCalled();
  });

  it('passes over executions that did not ask the prompts, such as a resume that never started', async () => {
    const { deps, executionClient, callbackDeliveryService } = setup({
      executions: [
        createExecution(),
        createExecution({ executionId: 'failed-resume' }),
        pausedExecution,
      ],
    });
    executionClient.readEvents.mockImplementation(async (executionId) => ({
      events: executionId === 'paused-1' ? pausedEvents() : [],
      status: ExecutionStatus.completed,
    }));

    await deliverPromptResolved({
      execution: createExecution(),
      events$: of(startedEvent),
      ...deps,
    });

    expect(callbackDeliveryService.makeCallbackRequest).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ execution_id: 'paused-1' }) })
    );
  });

  it('resolves, with a warning, when the delivery fails', async () => {
    const { deps, callbackDeliveryService, logger } = setup();
    callbackDeliveryService.makeCallbackRequest.mockRejectedValue(new Error('unreachable'));

    await expect(
      deliverPromptResolved({ execution: createExecution(), events$: of(startedEvent), ...deps })
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unreachable'));
  });
});
