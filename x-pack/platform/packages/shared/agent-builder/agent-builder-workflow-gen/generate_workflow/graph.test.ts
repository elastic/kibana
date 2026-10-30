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

  const PARSED_WORKFLOW = {
    version: '1',
    name: 'hello world',
    triggers: [{ type: 'manual' }],
    steps: [{ name: 'greet', type: 'console', with: { message: 'hi' } }],
  };

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
        parsedWorkflow: PARSED_WORKFLOW,
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
    expect(result.yaml).toBe(VALID_YAML);
  });

  it('preserves comments and formatting across a step edit', async () => {
    const commentedYaml = `version: '1'
name: hello world
# One greeting per run.
triggers:
  - type: manual # manual only, no schedule yet
steps:
  # Says hi to the operator.
  - name: greet
    type: console
    with:
      message: hi
`;
    const responses = [
      new AIMessage({
        content: '',
        tool_calls: [{ id: '1', name: 'set_yaml', args: { yaml: commentedYaml } }],
      }),
      new AIMessage({
        content: '',
        tool_calls: [
          {
            id: '2',
            name: 'modify_step_property',
            args: { stepName: 'greet', property: 'with.message', value: 'hello' },
          },
        ],
      }),
      new AIMessage({ content: 'done' }),
    ];
    const chatModel = buildChatModel(responses);

    const result = await generateWorkflow({
      nlQuery: 'greet with hello instead',
      ...baseDeps(chatModel),
    });

    expect(result.yaml).toContain('# One greeting per run.');
    expect(result.yaml).toContain('# manual only, no schedule yet');
    expect(result.yaml).toContain('# Says hi to the operator.');
    expect(result.yaml).toContain('message: hello');
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
    // Keyed off the YAML rather than call order: the tools node validates after
    // every edit, so a call-order mock would hand the "valid" answer to the
    // first attempt's per-edit check and the graph would never retry.
    deps.workflowsApi.validateWorkflow = jest.fn().mockImplementation(async (yaml: string) =>
      yaml === VALID_YAML
        ? { valid: true, diagnostics: [], parsedWorkflow: PARSED_WORKFLOW }
        : {
            valid: false,
            diagnostics: [{ severity: 'error', source: 'syntax', message: 'bad yaml' }],
          }
    );

    const result = await generateWorkflow({ nlQuery: 'q', ...deps });
    expect(result.workflow.name).toBe('hello world');
    // The returned YAML is the second attempt's, not the rejected first attempt's.
    expect(result.yaml).toBe(VALID_YAML);
    // Per-edit + post-loop validation, once per attempt.
    expect(deps.workflowsApi.validateWorkflow).toHaveBeenCalledTimes(4);
  });

  it('throws after maxRetries validation failures', async () => {
    const aiToolCall = () =>
      new AIMessage({
        content: '',
        tool_calls: [{ id: '1', name: 'set_yaml', args: { yaml: 'bad' } }],
      });
    const aiNoCall = () => new AIMessage({ content: 'done' });
    const responses = [
      aiToolCall(),
      aiNoCall(),
      aiToolCall(),
      aiNoCall(),
      aiToolCall(),
      aiNoCall(),
    ];
    const chatModel = buildChatModel(responses);

    const deps = baseDeps(chatModel);
    deps.workflowsApi.validateWorkflow = jest.fn().mockResolvedValue({
      valid: false,
      diagnostics: [{ severity: 'error', source: 's', message: 'bad' }],
    });

    await expect(generateWorkflow({ nlQuery: 'q', maxRetries: 3, ...deps })).rejects.toThrow(
      /Could not generate workflow/
    );
  });

  it('records currentYaml and a passing validation on each successful edit', async () => {
    const responses = [
      new AIMessage({
        content: '',
        tool_calls: [{ id: '1', name: 'set_yaml', args: { yaml: VALID_YAML } }],
      }),
      new AIMessage({ content: 'done' }),
    ];
    const chatModel = buildChatModel(responses);

    const deps = baseDeps(chatModel);
    // Per-edit + post-loop validation will both call validateWorkflow.
    deps.workflowsApi.validateWorkflow = jest.fn().mockResolvedValue({
      valid: true,
      diagnostics: [],
      parsedWorkflow: PARSED_WORKFLOW,
    });

    const result = await generateWorkflow({ nlQuery: 'q', ...deps });
    expect(result.workflow.name).toBe('hello world');
    // Per-edit validation runs once for the single set_yaml dispatch,
    // post-loop validation runs once more after the agent exits the loop.
    expect(deps.workflowsApi.validateWorkflow).toHaveBeenCalledTimes(2);
  });

  it('does not validate during lookup-only tool calls', async () => {
    const lookupYaml = `version: '1'
name: lookup-only
triggers:
  - type: manual
steps:
  - name: noop
    type: console
    with:
      message: hi
`;
    const responses = [
      new AIMessage({
        content: '',
        tool_calls: [
          {
            id: '1',
            name: 'get_step_definitions',
            args: { stepType: 'console' },
          },
        ],
      }),
      new AIMessage({
        content: '',
        tool_calls: [{ id: '2', name: 'set_yaml', args: { yaml: lookupYaml } }],
      }),
      new AIMessage({ content: 'done' }),
    ];
    const chatModel = buildChatModel(responses);

    const deps = baseDeps(chatModel);
    deps.workflowsApi.validateWorkflow = jest.fn().mockResolvedValue({
      valid: true,
      diagnostics: [],
      parsedWorkflow: {
        version: '1',
        name: 'lookup-only',
        triggers: [{ type: 'manual' }],
        steps: [{ name: 'noop', type: 'console', with: { message: 'hi' } }],
      },
    });

    await generateWorkflow({ nlQuery: 'q', ...deps });

    // get_step_definitions does NOT trigger per-edit validation;
    // set_yaml does (once); post-loop validate runs (once more).
    expect(deps.workflowsApi.validateWorkflow).toHaveBeenCalledTimes(2);
  });
});
