/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReplaySubject } from 'rxjs';
import { ChatEventType } from '@kbn/agent-builder-common';
import type { ChatEvent, ConversationRound } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '../../../../mocks';
import type { ModelProviderMock } from '../../../../test_utils';
import { createSendMessageTool } from './send_message';
import { SubagentTracker } from '../subagent_tracker';

const createMockContext = (selectedConnectorId = 'selected-connector') => {
  const modelProvider: ModelProviderMock = agentBuilderMocks.createModelProvider();
  modelProvider.selectModel.mockResolvedValue({
    connector: { connectorId: selectedConnectorId },
    chatModel: {},
    inferenceClient: {},
  } as never);

  return {
    context: {
      events: { reportProgress: jest.fn(), sendUiEvent: jest.fn() },
      modelProvider,
    } as any,
    modelProvider,
  };
};

const callHandler = async (
  tool: ReturnType<typeof createSendMessageTool>,
  params: {
    to: string;
    prompt: string;
    run_in_background?: boolean;
  },
  context: ReturnType<typeof createMockContext>['context']
) => tool.handler(params, context) as Promise<{ results: any[] }>;

const roundCompleteEvents = (round: Partial<ConversationRound> = {}) => {
  const events$ = new ReplaySubject<ChatEvent>();
  events$.next({
    type: ChatEventType.roundComplete,
    data: {
      round: {
        id: 'round-x',
        status: 'completed',
        input: { message: 'ping' },
        steps: [],
        response: { message: 'pong' },
        started_at: new Date().toISOString(),
        time_to_first_token: 100,
        time_to_last_token: 500,
        model_usage: { input_tokens: 5, output_tokens: 10 },
        ...round,
      },
    },
  } as ChatEvent);
  events$.complete();
  return events$;
};

describe('createSendMessageTool', () => {
  it('errors when no subagentTracker is available in the context', async () => {
    const tool = createSendMessageTool({
      agentId: 'test-agent',
      executionId: 'parent-exec',
      subAgentExecutor: {
        executeSubAgent: jest.fn(),
        createSubAgent: jest.fn(),
        sendToSubAgent: jest.fn(),
        getExecution: jest.fn(),
      },
    });

    const { context } = createMockContext();
    const result = await callHandler(tool, { to: 'researcher', prompt: 'hi' }, context);

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('not available in this execution context'),
      })
    );
  });

  it('errors with the available roster when the recipient name is unknown', async () => {
    const subagentTracker = new SubagentTracker({ researcher: 'child-1', writer: 'child-2' });

    const tool = createSendMessageTool({
      agentId: 'test-agent',
      executionId: 'parent-exec',
      subAgentExecutor: {
        executeSubAgent: jest.fn(),
        createSubAgent: jest.fn(),
        sendToSubAgent: jest.fn(),
        getExecution: jest.fn(),
      },
      subagentTracker,
    });

    const { context } = createMockContext();
    const result = await callHandler(tool, { to: 'unknown', prompt: 'hi' }, context);

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data.message).toContain('No sub-agent named "unknown"');
    // Available roster surfaced in the error to help the LLM correct itself.
    expect(result.results[0].data.message).toContain('researcher');
    expect(result.results[0].data.message).toContain('writer');
  });

  it('errors with "none yet" hint when the roster is empty', async () => {
    const subagentTracker = new SubagentTracker();

    const tool = createSendMessageTool({
      agentId: 'test-agent',
      executionId: 'parent-exec',
      subAgentExecutor: {
        executeSubAgent: jest.fn(),
        createSubAgent: jest.fn(),
        sendToSubAgent: jest.fn(),
        getExecution: jest.fn(),
      },
      subagentTracker,
    });

    const { context } = createMockContext();
    const result = await callHandler(tool, { to: 'researcher', prompt: 'hi' }, context);

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data.message).toContain(
      'No persistent sub-agents have been created yet'
    );
  });

  it('sends to a known sub-agent (foreground) and returns the final response', async () => {
    const events$ = roundCompleteEvents({ response: { message: 'reply from researcher' } });
    const sendToSubAgent = jest.fn().mockResolvedValue({
      executionId: 'sub-exec',
      events$: events$.asObservable(),
    });
    const subagentTracker = new SubagentTracker({ researcher: 'child-convo' });

    const tool = createSendMessageTool({
      agentId: 'test-agent',
      executionId: 'parent-exec',
      subAgentExecutor: {
        executeSubAgent: jest.fn(),
        createSubAgent: jest.fn(),
        sendToSubAgent,
        getExecution: jest.fn(),
      },
      subagentTracker,
    });

    const { context } = createMockContext('conn-x');
    const result = await callHandler(tool, { to: 'researcher', prompt: 'follow up' }, context);

    expect(sendToSubAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        parentExecutionId: 'parent-exec',
        conversationId: 'child-convo',
        prompt: 'follow up',
        connectorId: 'conn-x',
      })
    );
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual({
      agent_execution_id: 'sub-exec',
      status: 'completed',
      response: { message: 'reply from researcher' },
    });
  });

  it('registers with backgroundExecutionService and returns queued when run_in_background is true', async () => {
    const events$ = new ReplaySubject<ChatEvent>();
    const registerExecution = jest.fn();
    const sendToSubAgent = jest.fn().mockResolvedValue({
      executionId: 'bg-sub-exec',
      events$: events$.asObservable(),
    });
    const subagentTracker = new SubagentTracker({ researcher: 'child-convo' });

    const tool = createSendMessageTool({
      agentId: 'test-agent',
      executionId: 'parent-exec',
      subAgentExecutor: {
        executeSubAgent: jest.fn(),
        createSubAgent: jest.fn(),
        sendToSubAgent,
        getExecution: jest.fn(),
      },
      subagentTracker,
      backgroundExecutionService: {
        registerExecution,
        getState: jest.fn(),
        hasPending: jest.fn(),
        checkForCompletions: jest.fn(),
      } as any,
    });

    const { context } = createMockContext();
    const result = await callHandler(
      tool,
      { to: 'researcher', prompt: 'go', run_in_background: true },
      context
    );

    expect(result.results[0].data).toEqual({
      agent_execution_id: 'bg-sub-exec',
      status: 'queued',
    });
    // Critical: without this, checkForCompletions can never surface a
    // backgroundAgentComplete event for this send_message call.
    expect(registerExecution).toHaveBeenCalledWith('bg-sub-exec');

    events$.complete();
  });

  it('returns an error result when sendToSubAgent throws', async () => {
    const sendToSubAgent = jest.fn().mockRejectedValue(new Error('inference offline'));
    const subagentTracker = new SubagentTracker({ researcher: 'child-convo' });

    const tool = createSendMessageTool({
      agentId: 'test-agent',
      executionId: 'parent-exec',
      subAgentExecutor: {
        executeSubAgent: jest.fn(),
        createSubAgent: jest.fn(),
        sendToSubAgent,
        getExecution: jest.fn(),
      },
      subagentTracker,
    });

    const { context } = createMockContext();
    const result = await callHandler(tool, { to: 'researcher', prompt: 'hi' }, context);

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data.message).toContain('send_message failed');
    expect(result.results[0].data.message).toContain('inference offline');
  });
});
