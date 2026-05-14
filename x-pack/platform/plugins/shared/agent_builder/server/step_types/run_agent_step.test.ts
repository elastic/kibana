/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { of, throwError } from 'rxjs';
import {
  ChatEventType,
  ConversationRoundStatus,
  ConversationRoundStepType,
  createRequestAbortedError,
} from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import { ConfigSchema } from '../../common/step_types/run_agent_step';
import { CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_WORKFLOW } from '../../common/resolve_connector_or_inference_id';
import { getRunAgentStepDefinition } from './run_agent_step';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';

describe('ai.agent workflow step (Agent Builder)', () => {
  const createContext = (overrides: Partial<any> = {}) => {
    const fakeRequest = { headers: {} } as unknown as KibanaRequest;
    return {
      input: {},
      config: {},
      rawInput: {},
      contextManager: {
        getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
        getContext: jest.fn(),
        getScopedEsClient: jest.fn(),
        renderInputTemplate: jest.fn(),
      },
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      abortSignal: new AbortController().signal,
      stepId: 'test-step',
      stepType: 'ai.agent',
      ...overrides,
    } as StepHandlerContext;
  };

  const createExecutionMock = (events$: any) => ({
    executeAgent: jest.fn().mockResolvedValue({ executionId: 'exec-1', events$ }),
  });

  it('creates and persists a conversation when create_conversation is true, and emits conversation_id', async () => {
    const events$ = of(
      {
        type: ChatEventType.conversationCreated,
        data: { conversation_id: 'c-1', title: 't' },
      },
      {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok', structured_output: { foo: 'bar' } },
          },
        },
      }
    );

    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const context = createContext({
      input: {
        message: 'hello',
      },
      config: {
        'create-conversation': true,
      },
    });
    const res = await step.handler(context);

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(res).toHaveProperty('output.conversation_id');
    expect(res.output?.conversation_id).toBe('c-1');
  });

  it('uses conversation_id from input (with:) and create-conversation from config (static)', async () => {
    const events$ = of(
      {
        type: ChatEventType.conversationCreated,
        data: { conversation_id: 'c-dash', title: 't' },
      },
      {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok' },
          },
        },
      }
    );

    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
          conversation_id: 'c-dash',
        },
        config: {
          'create-conversation': true,
        },
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(res).toHaveProperty('output.conversation_id', 'c-dash');
  });

  it('reuses an existing conversation_id and updates it for follow-up prompts', async () => {
    const events$ = of(
      {
        type: ChatEventType.conversationUpdated,
        data: { conversation_id: 'c-1', title: 't' },
      },
      {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok' },
          },
        },
      }
    );

    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'follow up',
          conversation_id: 'c-1',
        },
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(res.output?.conversation_id).toBe('c-1');
  });

  it('does not create a conversation when create_conversation is false and no conversation_id is provided', async () => {
    const events$ = of({
      type: ChatEventType.roundComplete,
      data: {
        round: {
          id: 'r-1',
          response: { message: 'ok' },
        },
      },
    });

    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'stateless',
        },
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(res.output?.conversation_id).toBeUndefined();
  });

  it('propagates execution service errors (e.g., missing connector)', async () => {
    const execError = new Error('No LLM connector configured');
    const events$ = throwError(() => execError);

    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
        },
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(res.error).toBe(execError);
  });

  it('returns an error when no round_complete event is emitted', async () => {
    const events$ = of({
      type: ChatEventType.conversationCreated,
      data: { conversation_id: 'c-1', title: 't' },
    });

    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
        },
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(res.error).toBeInstanceOf(Error);
    expect(res.error?.message).toContain('No round_complete event');
  });

  it('fails when the workflow abort signal is already aborted', async () => {
    const events$ = throwError(() => createRequestAbortedError('Converse request was aborted'));

    const execution = createExecutionMock(events$);
    const abortController = new AbortController();
    abortController.abort();

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
        },
        abortSignal: abortController.signal,
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(res.error).toBeInstanceOf(Error);
    expect(res.error?.message).toContain('aborted');
  });

  it('propagates attachments to execution service nextInput', async () => {
    const attachments = [
      {
        id: 'attachment-1',
        type: 'security.alert',
        data: { alertId: 'alert-123', severity: 'high' },
      },
      {
        type: 'document',
        data: { content: 'test content' },
        hidden: true,
      },
    ];

    const events$ = of({
      type: ChatEventType.roundComplete,
      data: {
        round: {
          id: 'r-1',
          response: { message: 'ok' },
        },
      },
    });
    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: {
        execution,
      },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
          attachments,
        },
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(execution.executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          nextInput: {
            message: 'hello',
            attachments,
          },
        }),
      })
    );
    expect(res.output?.message).toBe('ok');
  });

  describe('S4 WAITING_FOR_INPUT propagation', () => {
    it('returns waitingForInput when the agent round has awaitingPrompt status', async () => {
      const formPrompt = {
        type: AgentPromptType.form,
        id: 'prompt-1',
        execution_id: 'inner-exec-id',
        step_execution_id: 'step-exec-id',
        message: 'Please fill out the form',
        schema: { type: 'object', properties: { name: { type: 'string' } } },
      };

      const events$ = of(
        {
          type: ChatEventType.conversationCreated,
          data: { conversation_id: 'c-1', title: 't' },
        },
        {
          type: ChatEventType.roundComplete,
          data: {
            round: {
              id: 'r-1',
              status: ConversationRoundStatus.awaitingPrompt,
              pending_prompts: [formPrompt],
              response: { message: '' },
            },
          },
        }
      );

      const execution = createExecutionMock(events$);
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager, undefined, true);

      const res = await step.handler(
        createContext({
          input: { message: 'hello' },
          config: { 'create-conversation': true },
        })
      );

      expect(res.waitingForInput).toBeDefined();
      expect(res.waitingForInput?.message).toBe('Please fill out the form');
      expect(res.waitingForInput?.schema).toEqual({
        type: 'object',
        properties: { name: { type: 'string' } },
      });
      expect(res.waitingForInput?.stepState).toEqual({
        conversationId: 'c-1',
        innerExecutionId: 'inner-exec-id',
      });
    });

    it('emits [hitl-debug][ab] runAgent.awaitingPrompt debug marker when round is awaitingPrompt', async () => {
      const formPrompt = {
        type: AgentPromptType.form,
        id: 'prompt-1',
        execution_id: 'inner-exec-id',
        step_execution_id: 'step-exec-id',
        message: 'Please fill out the form',
        schema: { type: 'object', properties: { name: { type: 'string' } } },
      };

      const events$ = of(
        { type: ChatEventType.conversationCreated, data: { conversation_id: 'c-1', title: 't' } },
        {
          type: ChatEventType.roundComplete,
          data: {
            round: {
              id: 'r-1',
              status: ConversationRoundStatus.awaitingPrompt,
              pending_prompts: [formPrompt],
              response: { message: '' },
            },
          },
        }
      );

      const execution = createExecutionMock(events$);
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager, undefined, true);

      const context = createContext({
        input: { message: 'hello' },
        config: { 'create-conversation': true },
        stepId: 'test-step-id',
      });
      await step.handler(context);

      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[hitl-debug][ab] runAgent.awaitingPrompt')
      );
      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('schemaPresent=true')
      );
      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('messagePresent=true')
      );
    });

    it('emits [hitl-debug][ab] runAgent.start debug marker at the start of execution', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: { round: { id: 'r-1', response: { message: 'ok' } } },
      });

      const execution = createExecutionMock(events$);
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager);

      const context = createContext({ input: { message: 'hello' }, stepId: 'my-step' });
      await step.handler(context);

      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[hitl-debug][ab] runAgent.start')
      );
    });

    it('answers the inner pending form prompt and re-runs the agent when isResuming is true', async () => {
      const resumeValues = { approved: true };
      const resumeWorkflowExecution = jest.fn().mockResolvedValue(undefined);

      const events$ = of(
        {
          type: ChatEventType.conversationUpdated,
          data: { conversation_id: 'c-1', title: 't' },
        },
        {
          type: ChatEventType.roundComplete,
          data: {
            round: {
              id: 'r-2',
              status: ConversationRoundStatus.completed,
              response: { message: 'workflow completed' },
            },
          },
        }
      );

      const execution = createExecutionMock(events$);
      const workflowsManagement = {
        management: {
          resumeWorkflowExecution,
          // getExecutionState (used by handleFormPromptResponse without a logger) reads the
          // advanced execution after resume.
          getWorkflowExecution: jest.fn().mockResolvedValue({
            id: 'inner-exec-id',
            status: 'completed',
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            workflowId: 'wf-1',
            workflowDefinition: { name: 'wf-1', steps: [] },
            stepExecutions: [],
          }),
        },
      } as any;

      // Inner conversation carries the pending form prompt the inner agent paused on.
      const conversationClient = {
        get: jest.fn().mockResolvedValue({
          rounds: [
            {
              status: ConversationRoundStatus.awaitingPrompt,
              steps: [],
              pending_prompts: [
                {
                  type: AgentPromptType.form,
                  id: 'inner-step-exec-id',
                  execution_id: 'inner-exec-id',
                  step_execution_id: 'inner-step-exec-id',
                  message: 'approve?',
                  schema: { type: 'object' },
                  resume_seq: 0,
                },
              ],
            },
          ],
        }),
        update: jest.fn().mockResolvedValue(undefined),
      };
      const conversations = {
        getScopedClient: jest.fn().mockResolvedValue(conversationClient),
      };
      const serviceManager = { internalStart: { execution, conversations } } as any;
      const step = getRunAgentStepDefinition(serviceManager, workflowsManagement, true);

      const fakeRequest = { headers: {} } as unknown as KibanaRequest;
      const res = await step.handler(
        createContext({
          input: { message: 'hello' },
          config: { 'create-conversation': true },
          isResuming: true,
          resumeInput: resumeValues,
          stepState: { conversationId: 'c-1', innerExecutionId: 'inner-exec-id' },
          contextManager: {
            getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
            getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'test-space' } }),
            getScopedEsClient: jest.fn(),
            renderInputTemplate: jest.fn(),
          },
        })
      );

      // The inner workflow is resumed via the pending form prompt's CAS path.
      expect(resumeWorkflowExecution).toHaveBeenCalledWith(
        'inner-exec-id',
        'test-space',
        resumeValues,
        fakeRequest,
        { expectedResumeSeq: 1 }
      );
      // The inner agent is re-run as a pure form submission (no message).
      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            conversationId: 'c-1',
            nextInput: expect.objectContaining({
              form_prompts: [
                expect.objectContaining({
                  execution_id: 'inner-exec-id',
                  values: resumeValues,
                }),
              ],
            }),
          }),
        })
      );
      expect(res.output?.message).toBe('workflow completed');
    });
  });

  describe('S5 agent_context is not surfaced on the nested HITL prompt', () => {
    it('does not attach agent_context even when the round has reasoning + tool-call steps', async () => {
      const formPrompt = {
        type: AgentPromptType.form,
        id: 'prompt-1',
        execution_id: 'inner-exec-id',
        step_execution_id: 'step-exec-id',
        message: 'Please fill out the form',
        schema: { type: 'object', properties: { name: { type: 'string' } } },
      };

      const events$ = of(
        { type: ChatEventType.conversationCreated, data: { conversation_id: 'c-1', title: 't' } },
        {
          type: ChatEventType.roundComplete,
          data: {
            round: {
              id: 'r-1',
              status: ConversationRoundStatus.awaitingPrompt,
              pending_prompts: [formPrompt],
              steps: [
                {
                  type: ConversationRoundStepType.reasoning,
                  reasoning: 'I should use the HITL tool to get approval',
                  tool_call_id: 'tc-1',
                },
                {
                  type: ConversationRoundStepType.toolCall,
                  tool_call_id: 'tc-1',
                  tool_id: 'andrew.testing.agent.hitl.test',
                  params: { message: 'Need approval' },
                  results: [],
                },
              ],
              response: { message: '' },
            },
          },
        }
      );

      const execution = createExecutionMock(events$);
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager, undefined, true);

      const res = await step.handler(
        createContext({ input: { message: 'hello' }, config: { 'create-conversation': true } })
      );

      expect(res.waitingForInput?.agent_context).toBeUndefined();
    });

    it('omits agent_context when round steps have no reasoning or tool-call steps', async () => {
      const formPrompt = {
        type: AgentPromptType.form,
        id: 'prompt-1',
        execution_id: 'inner-exec-id',
        step_execution_id: 'step-exec-id',
        message: 'Please fill out the form',
        schema: {},
      };

      const events$ = of(
        { type: ChatEventType.conversationCreated, data: { conversation_id: 'c-1', title: 't' } },
        {
          type: ChatEventType.roundComplete,
          data: {
            round: {
              id: 'r-1',
              status: ConversationRoundStatus.awaitingPrompt,
              pending_prompts: [formPrompt],
              steps: [],
              response: { message: '' },
            },
          },
        }
      );

      const execution = createExecutionMock(events$);
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager, undefined, true);

      const res = await step.handler(
        createContext({ input: { message: 'hello' }, config: { 'create-conversation': true } })
      );

      expect(res.waitingForInput?.agent_context).toBeUndefined();
    });

    it('does not emit waitingForInput when inboxEnabled is false, even if round has awaitingPrompt status', async () => {
      const formPrompt = {
        type: AgentPromptType.form,
        id: 'prompt-1',
        execution_id: 'inner-exec-id',
        step_execution_id: 'step-exec-id',
        message: 'Please fill out the form',
        schema: {},
      };

      const events$ = of(
        { type: ChatEventType.conversationCreated, data: { conversation_id: 'c-1', title: 't' } },
        {
          type: ChatEventType.roundComplete,
          data: {
            round: {
              id: 'r-1',
              status: ConversationRoundStatus.awaitingPrompt,
              pending_prompts: [formPrompt],
              steps: [],
              response: { message: '' },
            },
          },
        }
      );

      const execution = createExecutionMock(events$);
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager, undefined, false);

      const res = await step.handler(
        createContext({ input: { message: 'hello' }, config: { 'create-conversation': true } })
      );

      expect(res.waitingForInput).toBeUndefined();
    });
  });

  describe('connector-id / inference-id', () => {
    it('ConfigSchema rejects when both ids are meaningful', () => {
      const parsed = ConfigSchema.safeParse({
        'connector-id': 'a',
        'inference-id': 'b',
      });
      expect(parsed.success).toBe(false);
    });

    it('ConfigSchema accepts when connector-id is whitespace-only and inference-id is set', () => {
      const parsed = ConfigSchema.safeParse({
        'connector-id': '   ',
        'inference-id': 'b',
      });
      expect(parsed.success).toBe(true);
    });

    it('does not call executeAgent when both ids are meaningful (handler coalesce)', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok' },
          },
        },
      });
      const execution = createExecutionMock(events$);
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager);
      const res = await step.handler(
        createContext({
          input: { message: 'hello' },
          config: {
            'connector-id': 'a',
            'inference-id': 'b',
          },
        })
      );

      expect(execution.executeAgent).not.toHaveBeenCalled();
      expect(res.error?.message).toBe(CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_WORKFLOW);
    });

    it('passes trimmed inference-id as connectorId to executeAgent', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok' },
          },
        },
      });
      const execution = createExecutionMock(events$);
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager);
      await step.handler(
        createContext({
          input: { message: 'hello' },
          config: { 'inference-id': '  inf-1  ' },
        })
      );

      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ connectorId: 'inf-1' }),
        })
      );
    });
  });
});
