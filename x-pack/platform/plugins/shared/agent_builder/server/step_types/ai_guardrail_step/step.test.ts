/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

jest.mock('../utils/resolve_connector_id', () => ({
  resolveConnectorId: jest.fn().mockResolvedValue('mock-connector-id'),
}));

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((def: { handler: unknown }) => def),
}));

import { getAiGuardrailStepDefinition } from './step';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';

describe('getAiGuardrailStepDefinition (ai.guardrail)', () => {
  const fakeRequest = { headers: {} } as unknown as KibanaRequest;
  let mockInvoke: jest.Mock;
  let mockGetChatModel: jest.Mock;
  let mockCoreSetup: { getStartServices: jest.Mock };
  let mockLogger: { warn: jest.Mock };

  const defaultChecks = [
    {
      type: 'custom_prompt' as const,
      config: {
        system_prompt_details: 'Determine if the request is acceptable.',
        inference_id: 'my-connector-id',
      },
    },
  ];

  const createContext = (
    input: {
      message: string;
      conversation_history?: unknown[];
      attachments?: unknown[];
      previous_conversations?: number;
      on_fail?: 'abort' | 'monitor';
      abort_message?: string;
      checks: Array<{ type: 'custom_prompt'; config: Record<string, unknown> }>;
    },
    overrides: Partial<StepHandlerContext> = {}
  ): StepHandlerContext =>
    ({
      input,
      rawInput: input,
      config: {},
      contextManager: {
        getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
        getContext: jest.fn(),
        getScopedEsClient: jest.fn(),
        renderInputTemplate: jest.fn(),
      },
      logger: mockLogger,
      abortSignal: new AbortController().signal,
      stepId: 'validate',
      stepType: 'ai.guardrail',
      ...overrides,
    } as StepHandlerContext);

  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoke = jest.fn().mockResolvedValue({ parsed: { pass: true } });
    mockGetChatModel = jest.fn().mockResolvedValue({
      withStructuredOutput: jest.fn().mockReturnValue({ invoke: mockInvoke }),
    });
    mockCoreSetup = {
      getStartServices: jest
        .fn()
        .mockResolvedValue([{}, { inference: { getChatModel: mockGetChatModel } }]),
    };
    mockLogger = { warn: jest.fn() };
  });

  it('returns pass true when LLM returns pass true', async () => {
    const step = getAiGuardrailStepDefinition(mockCoreSetup as any);
    const result = await step.handler(createContext({ message: 'Hello.', checks: defaultChecks }));
    expect(result.output?.pass).toBe(true);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const [modelInput] = mockInvoke.mock.calls[0];
    expect(modelInput[1].content).toContain('## Current message');
    expect(modelInput[1].content).toContain('Hello.');
  });

  it('on_fail abort uses abort_message and sets abort true', async () => {
    mockInvoke.mockResolvedValue({ parsed: { pass: false, reason: 'Bad.' } });
    const step = getAiGuardrailStepDefinition(mockCoreSetup as any);
    const result = await step.handler(
      createContext({
        message: 'x',
        on_fail: 'abort',
        abort_message: 'Blocked.',
        checks: defaultChecks,
      })
    );
    expect(result.output?.pass).toBe(false);
    expect(result.output?.abort).toBe(true);
    expect(result.output?.abort_message).toBe('Blocked.');
  });

  it('on_fail monitor logs and returns pass true', async () => {
    mockInvoke.mockResolvedValue({ parsed: { pass: false, reason: 'Shadow hit.' } });
    const step = getAiGuardrailStepDefinition(mockCoreSetup as any);
    const result = await step.handler(
      createContext({ message: 'x', on_fail: 'monitor', checks: defaultChecks })
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Guardrail violation detected',
      expect.objectContaining({ reason: 'Shadow hit.' })
    );
    expect(result.output?.pass).toBe(true);
    expect(result.output?.reason).toBe('Violation detected but ignored due to monitor mode');
  });

  it('slices conversation_history by previous_conversations', async () => {
    const step = getAiGuardrailStepDefinition(mockCoreSetup as any);
    await step.handler(
      createContext({
        message: 'Current',
        conversation_history: [
          { role: 'user', content: 'A' },
          { role: 'assistant', content: 'B' },
          { role: 'user', content: 'C' },
          { role: 'assistant', content: 'D' },
        ],
        previous_conversations: 2,
        checks: defaultChecks,
      })
    );
    const userContent = mockInvoke.mock.calls[0][0][1].content as string;
    expect(userContent).toContain('C');
    expect(userContent).toContain('D');
    expect(userContent).not.toContain('[user]: A');
  });

  it('LLM failure is fail-closed', async () => {
    const err = new Error('429');
    mockInvoke.mockRejectedValue(err);
    const step = getAiGuardrailStepDefinition(mockCoreSetup as any);
    const result = await step.handler(createContext({ message: 'x', checks: defaultChecks }));
    expect(mockLogger.warn).toHaveBeenCalledWith('Guardrail LLM evaluation failed', err);
    expect(result.output?.pass).toBe(false);
    expect(result.output?.abort).toBe(true);
  });

  it('LLM failure in monitor mode ignores error and returns pass true', async () => {
    const err = new Error('500');
    mockInvoke.mockRejectedValue(err);
    const step = getAiGuardrailStepDefinition(mockCoreSetup as any);
    const result = await step.handler(
      createContext({ message: 'x', on_fail: 'monitor', checks: defaultChecks })
    );
    expect(mockLogger.warn).toHaveBeenCalledWith('Guardrail LLM evaluation failed', err);
    expect(result.output?.pass).toBe(true);
    expect(result.output?.reason).toBe('System error ignored due to monitor mode');
    expect(result.output?.abort).toBeFalsy();
  });
});
