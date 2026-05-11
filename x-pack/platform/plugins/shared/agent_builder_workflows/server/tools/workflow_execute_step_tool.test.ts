/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionMode } from '@kbn/agent-builder-common';
import type { ConfirmPromptDefinition } from '@kbn/agent-builder-common/agents/prompts';
import { AgentPromptType, ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type {
  ToolHandlerPromptReturn,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { ExecutionStatus, type InternalConnectorContract } from '@kbn/workflows';
import { WorkflowValidationError } from '@kbn/workflows-yaml';
import {
  registerWorkflowExecuteStepTool,
  SAFE_STEP_TYPES,
  WORKFLOW_EXECUTE_STEP_TOOL_ID,
} from './workflow_execute_step_tool';
import { getAllConnectorsInternal } from '@kbn/workflows-management-plugin/common/schema';

const VALID_WORKFLOW_YAML = `version: '1'
name: test-workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: log_step
    type: console
    with:
      message: "hello"
  - name: get_case
    type: cases.getCase
    with:
      case_id: "case-1"
  - name: search_step
    type: elasticsearch.search
    with:
      index: my-index
      body:
        query:
          match_all: {}
  - name: send_slack
    type: slack
    connector-id: my-slack
    with:
      message: "notification"
  - name: delete_index
    type: elasticsearch.indices.delete
    with:
      index: temp-index
  - name: check_alerts
    type: if
    condition: "steps.search_step.output.hits.total.value > 0"
    steps:
      - name: nested_slack
        type: slack
        connector-id: nested-connector
        with:
          message: "alert found"
      - name: nested_log
        type: console
        with:
          message: "nested hello"
    else:
      - name: nested_else_log
        type: console
        with:
          message: "no alerts"
  - name: safe_if
    type: if
    condition: "true"
    steps:
      - name: safe_child_log
        type: console
        with:
          message: "safe child"
      - name: safe_child_search
        type: elasticsearch.search
        with:
          index: my-index
  - name: outer_foreach
    type: foreach
    foreach: "items"
    steps:
      - name: inner_if
        type: if
        condition: "true"
        steps:
          - name: deep_http
            type: http
            with:
              url: "https://example.com"
`;

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

const VALID_WORKFLOW_WITH_FAILURE_BRANCHES = `version: '1'
name: test-workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: check_with_fallback
    type: if
    condition: "true"
    steps:
      - name: safe_log
        type: console
        with:
          message: "safe"
    on-failure:
      fallback:
        - name: fallback_http
          type: http
          with:
            url: "https://example.com"
`;

interface MockContextOptions {
  executionMode?: AgentExecutionMode;
  promptStatus?: ConfirmationStatus;
  toolCallId?: string;
}

const createMockContext = (yaml?: string, options: MockContextOptions = {}) => {
  const askForConfirmation = jest.fn(
    (def: ConfirmPromptDefinition): ToolHandlerPromptReturn => ({
      prompt: { type: AgentPromptType.confirmation, ...def },
    })
  );
  const checkConfirmationStatus = jest.fn().mockReturnValue({
    status: options.promptStatus ?? ConfirmationStatus.unprompted,
  });

  return {
    spaceId: 'default',
    request: { headers: {} },
    // Default to standalone so legacy tests (which expect the unsafe-step
    // preview path) keep passing. Override with conversation mode to exercise
    // the in-handler HITL gate.
    executionMode: options.executionMode ?? AgentExecutionMode.standalone,
    callContext: {
      toolId: WORKFLOW_EXECUTE_STEP_TOOL_ID,
      toolCallId: options.toolCallId ?? 'tc_default',
      callSource: 'agent' as const,
    },
    prompts: {
      checkConfirmationStatus,
      askForConfirmation,
    },
    attachments: {
      getActive: jest.fn().mockReturnValue(
        yaml
          ? [
              {
                type: 'workflow.yaml',
                id: 'att-1',
                versions: [{ data: { yaml, workflowId: 'wf-1' } }],
              },
            ]
          : []
      ),
    },
  };
};

describe('registerWorkflowExecuteStepTool', () => {
  let registeredTool: BuiltinToolDefinition;

  const mockApi = {
    testStep: jest.fn(),
    getWorkflowExecution: jest.fn(),
    validateWorkflow: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;

    registerWorkflowExecuteStepTool(agentBuilder, mockApi);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe(WORKFLOW_EXECUTE_STEP_TOOL_ID);
  });

  it('returns error when no workflow.yaml attachment is present', async () => {
    const context = createMockContext();
    const result = await invokeHandler(registeredTool, { stepName: 'log_step' }, context);

    expect(result.results[0].data).toEqual({
      success: false,
      error:
        'No workflow YAML attachment found. Provide the `yaml` parameter with inline YAML, or create a workflow first.',
    });
  });

  it('returns error when step name is not found', async () => {
    const context = createMockContext(VALID_WORKFLOW_YAML);
    const result = await invokeHandler(registeredTool, { stepName: 'nonexistent_step' }, context);

    expect(result.results[0].data).toEqual({
      success: false,
      error: 'Step "nonexistent_step" not found in the workflow YAML',
    });
  });

  describe('safe step execution', () => {
    it('executes a console step and returns result', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-123');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            stepId: 'log_step',
            status: ExecutionStatus.COMPLETED,
          },
        ],
        error: null,
        duration: 150,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'log_step' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(true);
      expect(data.executionId).toBe('exec-123');
      expect(data.status).toBe(ExecutionStatus.COMPLETED);
      expect(data.duration).toBe(150);
      expect(mockApi.testStep).toHaveBeenCalledWith(
        VALID_WORKFLOW_YAML,
        'log_step',
        'wf-1',
        undefined,
        {},
        'default',
        context.request
      );
    });

    it('executes an elasticsearch.search step (safe)', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-456');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'search_step', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 200,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'search_step' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(true);
      expect(data.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('executes a cases.getCase step (safe)', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-cases-123');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'get_case', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 90,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'get_case' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(true);
      expect(data.executionId).toBe('exec-cases-123');
      expect(data.status).toBe(ExecutionStatus.COMPLETED);
      expect(mockApi.testStep).toHaveBeenCalledWith(
        VALID_WORKFLOW_YAML,
        'get_case',
        'wf-1',
        undefined,
        {},
        'default',
        context.request
      );
    });

    it.each([
      ['slack2.listChannels', { limit: 10 }],
      ['slack2.resolveChannelId', { name: 'general' }],
      ['slack2.searchMessages', { query: 'release' }],
    ])('executes a %s step without prompting', async (stepType, withParams) => {
      jest.useRealTimers();

      const yaml = `version: '1'
name: slack-read
enabled: true
triggers:
  - type: manual
steps:
  - name: slack_read
    type: ${stepType}
    connector-id: my-slack
    with: ${JSON.stringify(withParams)}
`;

      mockApi.testStep.mockResolvedValue('exec-slack-read');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'slack_read', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 40,
      });

      const context = createMockContext(yaml);
      const result = await invokeHandler(registeredTool, { stepName: 'slack_read' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(true);
      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(context.prompts.checkConfirmationStatus).not.toHaveBeenCalled();
    });

    it('passes contextOverride to testStep', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-789');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [],
        error: null,
        duration: 50,
      });

      const override = { steps: { prev: { output: { data: [1, 2, 3] } } } };
      const context = createMockContext(VALID_WORKFLOW_YAML);
      await invokeHandler(
        registeredTool,
        { stepName: 'log_step', contextOverride: override },
        context
      );

      expect(mockApi.testStep).toHaveBeenCalledWith(
        VALID_WORKFLOW_YAML,
        'log_step',
        'wf-1',
        undefined,
        override,
        'default',
        context.request
      );
    });

    it('returns failed status when step execution fails', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-fail');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.FAILED,
        stepExecutions: [{ stepId: 'log_step', status: ExecutionStatus.FAILED }],
        error: { message: 'Step failed' },
        duration: 100,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'log_step' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(false);
      expect(data.status).toBe(ExecutionStatus.FAILED);
      expect(data.error).toEqual({ message: 'Step failed' });
    });

    it('executes a nested safe step (inside if.steps)', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-nested');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'nested_log', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 80,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'nested_log' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(true);
      expect(data.status).toBe(ExecutionStatus.COMPLETED);
      expect(mockApi.testStep).toHaveBeenCalledWith(
        VALID_WORKFLOW_YAML,
        'nested_log',
        'wf-1',
        undefined,
        {},
        'default',
        context.request
      );
    });

    it('executes a nested safe step (inside if.else)', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-else');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'nested_else_log', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 60,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'nested_else_log' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(true);
      expect(data.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('stubs unsafe children for a nested if step before execution', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-inner-if');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'inner_if', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 70,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'inner_if' }, context);
      const data = result.results[0].data as Record<string, unknown>;
      const stubbedYaml = mockApi.testStep.mock.calls[0][0] as string;

      expect(data.success).toBe(true);
      expect(data.conditionTest).toBe(true);
      expect(stubbedYaml).toContain('name: __stub_then');
      expect(stubbedYaml).not.toContain('name: deep_http');
    });

    it('returns error when testStep throws', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockRejectedValue(new Error('Workflow validation failed'));

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'log_step' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(false);
      expect(data.error).toBe('Workflow validation failed');
    });

    it('preserves validationErrors when testStep throws WorkflowValidationError', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockRejectedValue(
        new WorkflowValidationError('Workflow validation failed', ['Step names must be unique'])
      );

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'log_step' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(false);
      expect(data.error).toBe('Workflow validation failed');
      expect(data.validationErrors).toEqual(['Step names must be unique']);
    });

    it('returns timeout when polling does not reach a terminal status', async () => {
      mockApi.testStep.mockResolvedValue('exec-timeout');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: 'running',
        stepExecutions: [],
        error: null,
        duration: null,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const resultPromise = invokeHandler(registeredTool, { stepName: 'log_step' }, context);

      await jest.advanceTimersByTimeAsync(30_000);

      const result = await resultPromise;
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(false);
      expect(data.status).toBe('timeout');
      expect(data.error).toBe(
        'Step execution did not complete within 30s. The execution may still be running.'
      );
    });

    it('returns success false for malformed inline YAML instead of throwing', async () => {
      const context = createMockContext();
      const result = await invokeHandler(
        registeredTool,
        {
          stepName: 'log_step',
          yaml: `steps:\n  - name: log_step\n    type: console\n    with:\n      message: [`,
        },
        context
      );
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(false);
      expect(typeof data.error).toBe('string');
    });
  });

  describe('unsafe step blocking', () => {
    it('blocks a step whose own type is unsafe', async () => {
      mockApi.validateWorkflow.mockResolvedValue({ valid: true, diagnostics: [] });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'send_slack' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.blocked).toBe(true);
      expect(data.stepType).toBe('slack');
      expect(data.unsafeStepType).toBe('slack');
      expect(data.unsafeChildStepId).toBeUndefined();
      expect(data.validation).toEqual({ valid: true });
      expect(data.hint).toContain('Run step');
      expect(mockApi.testStep).not.toHaveBeenCalled();
    });

    it('blocks elasticsearch.indices.delete with validation errors', async () => {
      mockApi.validateWorkflow.mockResolvedValue({
        valid: false,
        diagnostics: [{ severity: 'error', source: 'schema', message: 'Invalid index name' }],
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'delete_index' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.blocked).toBe(true);
      expect(data.stepType).toBe('elasticsearch.indices.delete');
      expect(data.reason).toContain('external side effects');
      expect(data.validation).toEqual({
        valid: false,
        errors: ['[schema] Invalid index name'],
      });
    });

    it('blocks a nested unsafe step referenced directly', async () => {
      mockApi.validateWorkflow.mockResolvedValue({ valid: true, diagnostics: [] });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'nested_slack' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.blocked).toBe(true);
      expect(data.stepType).toBe('slack');
      expect(data.unsafeStepType).toBe('slack');
      expect(mockApi.testStep).not.toHaveBeenCalled();
    });

    it('stubs and executes an if step that contains an unsafe child', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-check-alerts');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'check_alerts', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 110,
      });
      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'check_alerts' }, context);
      const data = result.results[0].data as Record<string, unknown>;
      const stubbedYaml = mockApi.testStep.mock.calls[0][0] as string;

      expect(data.success).toBe(true);
      expect(data.conditionTest).toBe(true);
      expect(data.blocked).toBeUndefined();
      expect(stubbedYaml).toContain('name: __stub_then');
      expect(stubbedYaml).toContain('name: __stub_else');
      expect(stubbedYaml).not.toContain('name: nested_slack');
    });

    it('blocks a foreach with a deeply nested unsafe step', async () => {
      mockApi.validateWorkflow.mockResolvedValue({ valid: true, diagnostics: [] });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'outer_foreach' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.blocked).toBe(true);
      expect(data.stepType).toBe('foreach');
      expect(data.unsafeStepType).toBe('http');
      expect(data.unsafeChildStepId).toBe('deep_http');
      expect(data.reason).toContain('contains child step "deep_http"');
      expect(mockApi.testStep).not.toHaveBeenCalled();
    });

    it('allows an if step where all children are safe', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-safe-if');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'safe_if', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 90,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'safe_if' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(true);
      expect(data.blocked).toBeUndefined();
      expect(mockApi.testStep).toHaveBeenCalled();
    });

    it('stubs unsafe fallback children under on-failure', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-fallback');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'check_with_fallback', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 90,
      });

      const context = createMockContext(VALID_WORKFLOW_WITH_FAILURE_BRANCHES);
      const result = await invokeHandler(
        registeredTool,
        { stepName: 'check_with_fallback' },
        context
      );
      const data = result.results[0].data as Record<string, unknown>;
      const stubbedYaml = mockApi.testStep.mock.calls[0][0] as string;

      expect(data.success).toBe(true);
      expect(data.conditionTest).toBe(true);
      expect(stubbedYaml).toContain('name: __stub_fallback');
      expect(stubbedYaml).not.toContain('name: fallback_http');
    });
  });

  describe('unsafe step HITL confirmation', () => {
    const invokePromptHandler = async (
      tool: BuiltinToolDefinition,
      input: unknown,
      context: unknown
    ) => (await tool.handler(input as never, context as never)) as ToolHandlerPromptReturn;

    it('returns a confirmation prompt the first time an unsafe step is executed', async () => {
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
        promptStatus: ConfirmationStatus.unprompted,
      });
      const result = await invokePromptHandler(
        registeredTool,
        {
          stepName: 'send_slack',
          confirmation_body: '**Slack channel:** #alerts\n**Message:** notification',
        },
        context
      );

      expect(result.prompt).toBeDefined();
      expect(result.prompt.type).toBe(AgentPromptType.confirmation);
      expect(result.prompt.id).toContain(WORKFLOW_EXECUTE_STEP_TOOL_ID);
      // Slack is unsafe but not destructive → 'warning'
      expect(result.prompt.color).toBe('warning');
      expect(result.prompt.message).toContain('#alerts');
      expect(mockApi.testStep).not.toHaveBeenCalled();
    });

    it('uses color "danger" for destructive ES operations', async () => {
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
      });
      const result = await invokePromptHandler(
        registeredTool,
        {
          stepName: 'delete_index',
          confirmation_body: 'Will permanently delete index `temp-index`. NOT reversible.',
        },
        context
      );

      expect(result.prompt.color).toBe('danger');
      expect(result.prompt.title).toContain('elasticsearch.indices.delete');
    });

    it('falls back to a generated preview when confirmation_body is omitted', async () => {
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
      });
      const result = await invokePromptHandler(registeredTool, { stepName: 'send_slack' }, context);

      expect(result.prompt.message).toContain('send_slack');
      expect(result.prompt.message).toContain('slack');
    });

    it('falls back to the generated preview when confirmation_body is an empty string', async () => {
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
      });
      const result = await invokePromptHandler(
        registeredTool,
        { stepName: 'send_slack', confirmation_body: '' },
        context
      );

      expect(result.prompt.message).toContain('send_slack');
      expect(result.prompt.message).toContain('slack');
      expect(result.prompt.message).not.toBe('');
    });

    it('executes the step after the user accepts the prompt', async () => {
      jest.useRealTimers();
      mockApi.testStep.mockResolvedValue('exec-slack-accepted');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'send_slack', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 75,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
        promptStatus: ConfirmationStatus.accepted,
      });
      const result = await invokeHandler(registeredTool, { stepName: 'send_slack' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(true);
      expect(data.executionId).toBe('exec-slack-accepted');
      expect(mockApi.testStep).toHaveBeenCalled();
      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
    });

    it('returns an error result when the user rejects the prompt', async () => {
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
        promptStatus: ConfirmationStatus.rejected,
      });
      const result = await invokeHandler(registeredTool, { stepName: 'send_slack' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(false);
      expect(data.error).toBe('User declined to execute this step.');
      expect(mockApi.testStep).not.toHaveBeenCalled();
    });

    it('falls back to the preview path in standalone mode (no prompt)', async () => {
      mockApi.validateWorkflow.mockResolvedValue({ valid: true, diagnostics: [] });
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.standalone,
      });
      const result = await invokeHandler(registeredTool, { stepName: 'send_slack' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.blocked).toBe(true);
      expect(data.stepType).toBe('slack');
      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(mockApi.testStep).not.toHaveBeenCalled();
    });

    it('reuses the same promptId for re-invocations within one tool call (so accept/execute round-trip works)', async () => {
      const contextA = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
        toolCallId: 'tc_round_trip',
      });
      const contextB = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
        toolCallId: 'tc_round_trip',
      });

      await invokePromptHandler(
        registeredTool,
        { stepName: 'send_slack', confirmation_body: 'send hi to #alerts' },
        contextA
      );
      await invokePromptHandler(
        registeredTool,
        { stepName: 'send_slack', confirmation_body: 'send hi to #alerts' },
        contextB
      );

      const idA = (contextA.prompts.askForConfirmation as jest.Mock).mock.calls[0][0].id;
      const idB = (contextB.prompts.askForConfirmation as jest.Mock).mock.calls[0][0].id;
      expect(idA).toBe(idB);
      expect(idA).toContain('tc_round_trip');
    });

    it('uses a different promptId for separate tool invocations (per-call freshness)', async () => {
      const contextA = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
        toolCallId: 'tc_first',
      });
      const contextB = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
        toolCallId: 'tc_second',
      });

      await invokePromptHandler(
        registeredTool,
        { stepName: 'send_slack', confirmation_body: 'send hi to #alerts' },
        contextA
      );
      await invokePromptHandler(
        registeredTool,
        { stepName: 'send_slack', confirmation_body: 'send hi to #alerts' },
        contextB
      );

      const idA = (contextA.prompts.askForConfirmation as jest.Mock).mock.calls[0][0].id;
      const idB = (contextB.prompts.askForConfirmation as jest.Mock).mock.calls[0][0].id;
      expect(idA).not.toBe(idB);
    });

    it('prompts for confirmation when a foreach contains an unsafe descendant (conversation mode)', async () => {
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
      });
      const result = await invokePromptHandler(
        registeredTool,
        {
          stepName: 'outer_foreach',
          confirmation_body: 'Will iterate `items` and POST each to https://example.com',
        },
        context
      );

      expect(result.prompt).toBeDefined();
      expect(result.prompt.type).toBe(AgentPromptType.confirmation);
      expect(result.prompt.color).toBe('warning');
      expect(result.prompt.message).toContain('https://example.com');
      expect(mockApi.testStep).not.toHaveBeenCalled();
    });

    it('names the unsafe descendant in the fallback when confirmation_body is omitted on a container step', async () => {
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
      });
      const result = await invokePromptHandler(
        registeredTool,
        { stepName: 'outer_foreach' },
        context
      );

      // Title flags the descendant, not just the container.
      expect(result.prompt.title).toContain('outer_foreach');
      expect(result.prompt.title).toContain('deep_http');
      expect(result.prompt.title).toContain('http');
      // Fallback body names the descendant too.
      expect(result.prompt.message).toContain('deep_http');
      expect(result.prompt.message).toContain('http');
    });

    it('keeps if/while-with-unsafe-children on the stub path (no prompt)', async () => {
      jest.useRealTimers();
      mockApi.testStep.mockResolvedValue('exec-stub');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'check_alerts', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 60,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
      });
      const result = await invokeHandler(registeredTool, { stepName: 'check_alerts' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.conditionTest).toBe(true);
      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
    });

    it('does not prompt for safe step types', async () => {
      jest.useRealTimers();
      mockApi.testStep.mockResolvedValue('exec-safe');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'log_step', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 10,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
      });
      await invokeHandler(registeredTool, { stepName: 'log_step' }, context);
      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(context.prompts.checkConfirmationStatus).not.toHaveBeenCalled();
    });
  });
});

describe('SAFE_STEP_TYPES policy', () => {
  it('keeps connector-backed safe steps aligned with audited connector contracts', () => {
    const auditedSafeConnectorMethods: Record<string, readonly string[]> = {
      'elasticsearch.search': ['GET', 'POST'],
      'elasticsearch.esql.query': ['POST'],
      'elasticsearch.indices.exists': ['HEAD'],
      'kibana.getCase': ['GET'],
      'kibana.streams.list': ['GET'],
      'kibana.streams.get': ['GET'],
      'kibana.streams.getSignificantEvents': ['GET'],
    };

    const internalConnectors = new Map(
      getAllConnectorsInternal()
        .filter((connector): connector is InternalConnectorContract => 'methods' in connector)
        .map((connector) => [connector.type, connector])
    );

    const connectorBackedSafeSteps = Array.from(SAFE_STEP_TYPES)
      .filter((stepType) => internalConnectors.has(stepType))
      .sort();

    expect(connectorBackedSafeSteps).toEqual(Object.keys(auditedSafeConnectorMethods).sort());

    for (const [stepType, expectedMethods] of Object.entries(auditedSafeConnectorMethods)) {
      expect(internalConnectors.get(stepType)?.methods).toEqual(expectedMethods);
    }
  });
});
