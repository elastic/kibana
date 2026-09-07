/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { AgentEventEmitter } from '@kbn/agent-builder-server';
import { createAnswerAgentStructured } from './answer_agent_structured';
import { AgentActionType, type AgentErrorAction, type StructuredAnswerAction } from './actions';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import type { PromptFactory } from './prompts';
import type { StateType } from './state';

const createTestAgent = ({
  invokeResponse,
  outputSchema,
}: {
  invokeResponse: unknown;
  outputSchema?: Record<string, unknown>;
}) => {
  const invoke = jest.fn().mockResolvedValue(invokeResponse);
  const chatModel = {
    withStructuredOutput: jest.fn(() => ({
      withConfig: jest.fn(() => ({ invoke })),
    })),
  } as unknown as InferenceChatModel;

  const promptFactory = {
    getMainPrompt: jest.fn().mockResolvedValue([]),
    getStructuredAnswerPrompt: jest.fn().mockResolvedValue([]),
  } as jest.Mocked<PromptFactory>;

  const events = { emit: jest.fn() } as unknown as AgentEventEmitter;

  const agent = createAnswerAgentStructured({
    chatModel,
    promptFactory,
    events,
    outputSchema,
    logger: {} as Logger,
  });

  return { agent, chatModel, promptFactory, events, invoke };
};

const baseState: StateType = {
  answerActions: [],
  mainActions: [],
  errorCount: 0,
  cycleLimit: 10,
  currentCycle: 0,
  resumeToStep: '',
  interrupted: false,
  prompts: [],
  finalAnswer: '',
};

describe('createAnswerAgentStructured', () => {
  it('unwraps a wrapped string schema even when the response is an empty string', async () => {
    const { agent } = createTestAgent({
      invokeResponse: { response: '' },
      outputSchema: { type: 'string' },
    });

    const result = await agent(baseState);

    expect(result.answerActions).toHaveLength(1);
    expect(result.answerActions[0].type).toBe(AgentActionType.StructuredAnswer);
    expect((result.answerActions[0] as StructuredAnswerAction).data).toBe('');
  });

  it('unwraps a wrapped number schema even when the response is zero', async () => {
    const { agent } = createTestAgent({
      invokeResponse: { response: 0 },
      outputSchema: { type: 'number' },
    });

    const result = await agent(baseState);

    expect(result.answerActions).toHaveLength(1);
    expect(result.answerActions[0].type).toBe(AgentActionType.StructuredAnswer);
    expect((result.answerActions[0] as StructuredAnswerAction).data).toBe(0);
  });

  it('preserves a truthy wrapped response after unwrapping', async () => {
    const { agent } = createTestAgent({
      invokeResponse: { response: 'hello' },
      outputSchema: { type: 'string' },
    });

    const result = await agent(baseState);

    expect(result.answerActions).toHaveLength(1);
    expect(result.answerActions[0].type).toBe(AgentActionType.StructuredAnswer);
    expect((result.answerActions[0] as StructuredAnswerAction).data).toBe('hello');
  });

  it('does not unwrap an object schema response', async () => {
    const response = { name: 'x' };
    const { agent } = createTestAgent({
      invokeResponse: response,
      outputSchema: { type: 'object' },
    });

    const result = await agent(baseState);

    expect(result.answerActions).toHaveLength(1);
    expect(result.answerActions[0].type).toBe(AgentActionType.StructuredAnswer);
    expect((result.answerActions[0] as StructuredAnswerAction).data).toEqual(response);
  });

  it('returns a schemaViolation error when the unwrapped response does not conform to the output schema', async () => {
    const { agent } = createTestAgent({
      invokeResponse: { response: 123 },
      outputSchema: { type: 'string' },
    });

    const result = await agent(baseState);

    expect(result.answerActions).toHaveLength(1);
    expect(result.answerActions[0].type).toBe(AgentActionType.Error);
    expect((result.answerActions[0] as AgentErrorAction).error.meta.errCode).toBe(
      AgentExecutionErrorCode.schemaViolation
    );
    expect(result.errorCount).toBe(1);
  });

  it('returns a schemaViolation error when an object schema response does not conform to the output schema', async () => {
    const { agent } = createTestAgent({
      invokeResponse: { name: 123 },
      outputSchema: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    });

    const result = await agent(baseState);

    expect(result.answerActions).toHaveLength(1);
    expect(result.answerActions[0].type).toBe(AgentActionType.Error);
    expect((result.answerActions[0] as AgentErrorAction).error.meta.errCode).toBe(
      AgentExecutionErrorCode.schemaViolation
    );
    expect(result.errorCount).toBe(1);
  });
});
