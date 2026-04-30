/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage } from '@langchain/core/messages';
import { loggerMock } from '@kbn/logging-mocks';
import { generateWorkflow } from './generate_workflow';

describe('generateWorkflow (graph integration)', () => {
  const VALID_YAML = `version: '1'
name: hello world
triggers:
  - type: manual
steps:
  - name: greet
    type: console
    with:
      message: hi
`;

  const baseDeps = (chatModel: any) => ({
    model: { chatModel } as any,
    logger: loggerMock.create(),
    request: {} as any,
    spaceId: 'default',
    workflowsApi: {
      getAvailableConnectors: jest
        .fn()
        .mockResolvedValue({ connectorTypes: {}, totalConnectors: 0 }),
      validateWorkflow: jest.fn().mockResolvedValue({
        valid: true,
        diagnostics: [],
        parsedWorkflow: {
          version: '1',
          name: 'hello world',
          triggers: [{ type: 'manual' }],
          steps: [{ name: 'greet', type: 'console', with: { message: 'hi' } }],
        },
      }),
    } as any,
  });

  const buildChatModel = (responses: AIMessage[]) => {
    const invoke = jest.fn().mockImplementation(() => Promise.resolve(responses.shift()));
    return {
      bindTools: () => ({ invoke }),
    };
  };

  it('happy path: model emits a single set_yaml call, validation passes', async () => {
    const responses = [
      new AIMessage({
        content: '',
        tool_calls: [{ id: '1', name: 'set_yaml', args: { yaml: VALID_YAML } }],
      }),
      new AIMessage({ content: 'done' }),
    ];
    const chatModel = buildChatModel(responses);

    const result = await generateWorkflow({
      nlQuery: 'a hello world workflow',
      ...baseDeps(chatModel),
    });

    expect(result.workflow.name).toBe('hello world');
  });

  it('retries once when validation fails and succeeds on second attempt', async () => {
    const responses = [
      new AIMessage({
        content: '',
        tool_calls: [{ id: '1', name: 'set_yaml', args: { yaml: 'invalid: yaml: :' } }],
      }),
      new AIMessage({ content: 'done attempt 1' }),
      new AIMessage({
        content: '',
        tool_calls: [{ id: '2', name: 'set_yaml', args: { yaml: VALID_YAML } }],
      }),
      new AIMessage({ content: 'done attempt 2' }),
    ];
    const chatModel = buildChatModel(responses);

    const deps = baseDeps(chatModel);
    deps.workflowsApi.validateWorkflow = jest
      .fn()
      .mockResolvedValueOnce({
        valid: false,
        diagnostics: [{ severity: 'error', source: 'syntax', message: 'bad yaml' }],
      })
      .mockResolvedValueOnce({
        valid: true,
        diagnostics: [],
        parsedWorkflow: {
          version: '1',
          name: 'hello world',
          triggers: [{ type: 'manual' }],
          steps: [{ name: 'greet', type: 'console', with: { message: 'hi' } }],
        },
      });

    const result = await generateWorkflow({ nlQuery: 'q', ...deps });
    expect(result.workflow.name).toBe('hello world');
    expect(deps.workflowsApi.validateWorkflow).toHaveBeenCalledTimes(2);
  });

  it('throws after maxRetries validation failures', async () => {
    const aiToolCall = () =>
      new AIMessage({
        content: '',
        tool_calls: [{ id: '1', name: 'set_yaml', args: { yaml: 'bad' } }],
      });
    const aiNoCall = () => new AIMessage({ content: 'done' });
    const responses = [
      aiToolCall(), aiNoCall(),
      aiToolCall(), aiNoCall(),
      aiToolCall(), aiNoCall(),
    ];
    const chatModel = buildChatModel(responses);

    const deps = baseDeps(chatModel);
    deps.workflowsApi.validateWorkflow = jest.fn().mockResolvedValue({
      valid: false,
      diagnostics: [{ severity: 'error', source: 's', message: 'bad' }],
    });

    await expect(
      generateWorkflow({ nlQuery: 'q', maxRetries: 3, ...deps })
    ).rejects.toThrow(/Could not generate workflow/);
  });
});
