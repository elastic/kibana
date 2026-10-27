/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionMode } from '@kbn/agent-builder-common';
import type {
  ConfirmPromptDefinition,
  ConfirmationPrompt,
} from '@kbn/agent-builder-common/agents/prompts';
import {
  AgentPromptType,
  ConfirmationStatus,
  isConfirmationPrompt,
} from '@kbn/agent-builder-common/agents/prompts';
import type { BuiltinToolDefinition, ToolHandlerContext } from '@kbn/agent-builder-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type {
  ToolHandlerPromptReturn,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowValidationError } from '@kbn/workflows-yaml';
import {
  registerWorkflowExecuteStepTool,
  WORKFLOW_EXECUTE_STEP_TOOL_ID,
} from './workflow_execute_step_tool';

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
  interactive?: boolean;
  autoApprovedApis?: Array<{ target: 'elasticsearch' | 'kibana'; api: string }>;
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
    // Default to a standalone agent run: no user to ask, so unsafe steps are refused.
    // Override with conversation mode to exercise the confirmation prompt.
    executionMode: options.executionMode ?? AgentExecutionMode.standalone,
    interactivity: {
      enabled:
        options.interactive ??
        (options.executionMode ?? AgentExecutionMode.standalone) ===
          AgentExecutionMode.conversation,
      auto_approved_apis: options.autoApprovedApis,
    },
    callContext: {
      toolId: WORKFLOW_EXECUTE_STEP_TOOL_ID,
      toolCallId: options.toolCallId ?? 'tc_default',
      callSource: 'agent' as ToolHandlerContext['callContext']['callSource'],
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
  const getSecurity = jest.fn<SecurityPluginStart | undefined, []>();

  const mockApi = {
    testStep: jest.fn(),
    getWorkflowExecution: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    getSecurity.mockReturnValue(undefined);
    jest.useFakeTimers();

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;

    registerWorkflowExecuteStepTool(agentBuilder, mockApi, getSecurity);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe(WORKFLOW_EXECUTE_STEP_TOOL_ID);
  });

  it.each([true, false])(
    'does not execute a step without execute privilege (inline=%s)',
    async (inline) => {
      const atSpace = jest.fn().mockResolvedValue({ hasAllRequested: false });
      getSecurity.mockReturnValue({
        authz: {
          actions: { api: { get: (action: string) => `api:${action}` } },
          checkPrivilegesWithRequest: () => ({ atSpace }),
        },
      } as unknown as SecurityPluginStart);
      const context = createMockContext(inline ? undefined : VALID_WORKFLOW_YAML);

      const result = await invokeHandler(
        registeredTool,
        { stepName: 'log_step', ...(inline ? { yaml: VALID_WORKFLOW_YAML } : {}) },
        context
      );

      expect(result.results[0].data).toEqual({
        success: false,
        error:
          "Unauthorized to execute workflow step. The 'workflowsManagement' execute privilege is required.",
      });
      expect(atSpace).toHaveBeenCalledWith(context.spaceId, {
        kibana: ['api:workflowsManagement:execute'],
      });
      expect(mockApi.testStep).not.toHaveBeenCalled();
      expect(mockApi.getWorkflowExecution).not.toHaveBeenCalled();
    }
  );

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
      expect(mockApi.getWorkflowExecution).toHaveBeenCalledWith('exec-123', 'default', {
        includeOutput: true,
        request: context.request,
      });
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
      ['salesforce.query', { soql: 'SELECT COUNT(Id) total FROM Case' }],
      ['github.searchIssues', { query: 'is:open' }],
    ])('executes a %s step without prompting', async (stepType, withParams) => {
      jest.useRealTimers();

      const yaml = `version: '1'
name: connector-read
enabled: true
triggers:
  - type: manual
steps:
  - name: read_step
    type: ${stepType}
    connector-id: my-connector
    with: ${JSON.stringify(withParams)}
`;

      mockApi.testStep.mockResolvedValue('exec-connector-read');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'read_step', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 40,
      });

      const context = createMockContext(yaml);
      const result = await invokeHandler(registeredTool, { stepName: 'read_step' }, context);
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

  describe('unsafe step detection', () => {
    const askedFor = async (stepName: string, yaml = VALID_WORKFLOW_YAML) => {
      const context = createMockContext(yaml, { executionMode: AgentExecutionMode.conversation });
      await registeredTool.handler({ stepName } as never, context as never);
      expect(mockApi.testStep).not.toHaveBeenCalled();
      const [[prompt]] = (context.prompts.askForConfirmation as jest.Mock).mock.calls;
      return prompt as ConfirmPromptDefinition;
    };

    it('asks before a step whose own type is unsafe', async () => {
      const prompt = await askedFor('send_slack');
      expect(prompt.title).toContain('send_slack');
      expect(prompt.message).toContain('`send_slack` (`slack`)');
    });

    it('asks before an unsafe step whose type is a YAML alias', async () => {
      const prompt = await askedFor(
        'elasticsearch.indices.delete',
        `name: alias
triggers:
  - type: manual
steps:
  - name: &delete_type elasticsearch.indices.delete
    type: *delete_type
    with:
      index: test-x
`
      );
      expect(prompt.color).toBe('danger');
    });

    it('asks before a step whose unsafe children are a YAML alias', async () => {
      const prompt = await askedFor(
        'loop',
        `name: alias
consts:
  children: &children
    - name: drop
      type: elasticsearch.indices.delete
      with:
        index: test-x
triggers:
  - type: manual
steps:
  - name: loop
    type: foreach
    foreach: '[1]'
    steps: *children
`
      );
      expect(prompt.message).toContain('`drop` (`elasticsearch.indices.delete`)');
    });

    it('asks before a nested unsafe step referenced directly', async () => {
      const prompt = await askedFor('nested_slack');
      expect(prompt.message).toContain('`nested_slack` (`slack`)');
    });

    it('asks before a foreach with a deeply nested unsafe step', async () => {
      const prompt = await askedFor('outer_foreach');
      expect(prompt.title).toContain('deep_http');
      expect(prompt.message).toContain('`deep_http` (`http`)');
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
      expect(stubbedYaml).toContain('name: __stub_then');
      expect(stubbedYaml).toContain('name: __stub_else');
      expect(stubbedYaml).not.toContain('name: nested_slack');
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
    ): Promise<{ prompt: ConfirmationPrompt }> => {
      const result = (await tool.handler(
        input as never,
        context as never
      )) as ToolHandlerPromptReturn;
      if (!isConfirmationPrompt(result.prompt)) {
        throw new Error(`Expected confirmation prompt, got ${result.prompt.type}`);
      }
      return { prompt: result.prompt };
    };

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

    it('refuses an unsafe step in an ai.agent run that did not pre-approve it', async () => {
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
        interactive: false,
      });
      const result = await invokeHandler(registeredTool, { stepName: 'send_slack' }, context);

      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(mockApi.testStep).not.toHaveBeenCalled();
      expect(result.results[0].type).toBe('error');
      expect(JSON.stringify(result.results[0])).toContain('workflows.post-workflows-step-test');
    });

    it('runs an unsafe step in an ai.agent run that pre-approved workflows.*', async () => {
      jest.useRealTimers();
      mockApi.testStep.mockResolvedValue('exec-run');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [],
        error: null,
        duration: 1,
      });
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
        interactive: false,
        autoApprovedApis: [{ target: 'kibana', api: 'workflows.*' }],
      });
      await registeredTool.handler({ stepName: 'send_slack' } as never, context as never);

      expect(mockApi.testStep).toHaveBeenCalled();
    });

    it('runs without prompting when the run pre-approved workflows.*', async () => {
      jest.useRealTimers();
      mockApi.testStep.mockResolvedValue('exec-run');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [],
        error: null,
        duration: 1,
      });
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
        autoApprovedApis: [{ target: 'kibana', api: 'workflows.*' }],
      });
      await registeredTool.handler({ stepName: 'send_slack' } as never, context as never);

      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(mockApi.testStep).toHaveBeenCalled();
    });

    it('runs a destructive step without prompting when the run pre-approved its API', async () => {
      jest.useRealTimers();
      mockApi.testStep.mockResolvedValue('exec-run');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [],
        error: null,
        duration: 1,
      });
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
        autoApprovedApis: [{ target: 'elasticsearch', api: 'indices.delete' }],
      });
      await registeredTool.handler({ stepName: 'delete_index' } as never, context as never);

      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(mockApi.testStep).toHaveBeenCalled();
    });

    it('runs index creation without prompting, as execute_api does', async () => {
      jest.useRealTimers();
      mockApi.testStep.mockResolvedValue('exec-run');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [],
        error: null,
        duration: 1,
      });
      const context = createMockContext(undefined, {
        executionMode: AgentExecutionMode.conversation,
      });
      await registeredTool.handler(
        {
          stepName: 'create_index',
          yaml: `steps:
  - name: create_index
    type: elasticsearch.indices.create
    with:
      index: test-kir-100
`,
        } as never,
        context as never
      );

      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(mockApi.testStep).toHaveBeenCalled();
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

    it('prompts for a write-scoped connector action', async () => {
      const yaml = `version: '1'
name: github-write
enabled: true
triggers:
  - type: manual
steps:
  - name: create_issue
    type: github.createIssue
    connector-id: my-github
    with:
      title: "Broken login"
`;

      const context = createMockContext(yaml, {
        executionMode: AgentExecutionMode.conversation,
      });
      const result = await invokePromptHandler(
        registeredTool,
        { stepName: 'create_issue' },
        context
      );

      expect(result.prompt.type).toBe(AgentPromptType.confirmation);
      expect(mockApi.testStep).not.toHaveBeenCalled();
    });

    it('renders the step parameters as a YAML block above the agent summary', async () => {
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
      });
      const result = await invokePromptHandler(
        registeredTool,
        { stepName: 'send_slack', confirmation_body: 'Posts a notification to #alerts.' },
        context
      );

      const message = result.prompt.message ?? '';
      expect(message).toContain('```yaml');
      expect(message).toContain('name: send_slack');
      expect(message).toContain('type: slack');
      expect(message).toContain('message: notification');
      expect(message.indexOf('```yaml')).toBeLessThan(message.indexOf('Agent summary'));
    });

    it('renders a nested unsafe descendant inside the step YAML block', async () => {
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
      });
      const result = await invokePromptHandler(
        registeredTool,
        { stepName: 'outer_foreach' },
        context
      );

      const message = result.prompt.message ?? '';
      expect(message).toContain('```yaml');
      expect(message).toContain('deep_http');
      expect(message).toContain('https://example.com');
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

      expect(result.results[0].type).toBe('error');
      expect(JSON.stringify(result.results[0])).toContain(
        'The user declined to execute this step.'
      );
      expect(mockApi.testStep).not.toHaveBeenCalled();
    });

    it('runs an unsafe step called over MCP, where the MCP client confirms', async () => {
      jest.useRealTimers();
      mockApi.testStep.mockResolvedValue('exec-run');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [],
        error: null,
        duration: 1,
      });
      const context = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.standalone,
      });
      context.callContext.callSource = 'mcp';
      await registeredTool.handler({ stepName: 'send_slack' } as never, context as never);

      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(mockApi.testStep).toHaveBeenCalled();
    });

    it('asks again when the step YAML changed after the prompt', async () => {
      const first = createMockContext(VALID_WORKFLOW_YAML, {
        executionMode: AgentExecutionMode.conversation,
      });
      await invokePromptHandler(registeredTool, { stepName: 'send_slack' }, first);
      const shownId = (first.prompts.askForConfirmation as jest.Mock).mock.calls[0][0].id;

      const changed = createMockContext(
        VALID_WORKFLOW_YAML.replace('message: "notification"', 'message: "changed"'),
        { executionMode: AgentExecutionMode.conversation }
      );
      (changed.prompts.checkConfirmationStatus as jest.Mock).mockImplementation((id: string) => ({
        status: id === shownId ? ConfirmationStatus.accepted : ConfirmationStatus.unprompted,
      }));
      await invokePromptHandler(registeredTool, { stepName: 'send_slack' }, changed);

      expect(mockApi.testStep).not.toHaveBeenCalled();
      expect((changed.prompts.askForConfirmation as jest.Mock).mock.calls[0][0].id).not.toBe(
        shownId
      );
    });

    it('uses danger when any unsafe descendant is destructive, not only the first', async () => {
      const { prompt } = await invokePromptHandler(
        registeredTool,
        {
          stepName: 'loop',
          yaml: `steps:
  - name: loop
    type: foreach
    foreach: '[1]'
    steps:
      - name: notify
        type: slack
        connector-id: my-slack
        with:
          message: hi
      - name: drop
        type: elasticsearch.indices.delete
        with:
          index: logs
`,
        },
        createMockContext(undefined, { executionMode: AgentExecutionMode.conversation })
      );

      expect(prompt.color).toBe('danger');
      expect(prompt.message).toContain(
        '`notify` (`slack`), `drop` (`elasticsearch.indices.delete`)'
      );
    });

    it('puts the agent summary on its own lines, so its Markdown renders', async () => {
      const { prompt } = await invokePromptHandler(
        registeredTool,
        { stepName: 'send_slack', confirmation_body: '## Inputs\n- channel: #alerts' },
        createMockContext(VALID_WORKFLOW_YAML, { executionMode: AgentExecutionMode.conversation })
      );

      expect(prompt.message).toMatch(/^## Inputs$/m);
    });

    it('names an unsafe child even when the step YAML is cut', async () => {
      const { prompt } = await invokePromptHandler(
        registeredTool,
        {
          stepName: 'loop',
          yaml: `steps:
  - name: loop
    type: foreach
    foreach: '[1]'
    with:
      payload: "${'x'.repeat(3000)}"
    steps:
      - name: hidden_http
        type: http
        with:
          url: https://example.com
`,
        },
        createMockContext(undefined, { executionMode: AgentExecutionMode.conversation })
      );

      const message = prompt.message ?? '';
      expect(message).toContain('`hidden_http` (`http`)');
      expect(message.indexOf('hidden_http')).toBeLessThan(message.indexOf('```'));
    });

    it('keeps a step value with a code fence inside the YAML block', async () => {
      const { prompt } = await invokePromptHandler(
        registeredTool,
        {
          stepName: 'fenced',
          yaml: `steps:
  - name: fenced
    type: http
    with:
      body: |
        \`\`\`
        injected
`,
        },
        createMockContext(undefined, { executionMode: AgentExecutionMode.conversation })
      );

      const lines = (prompt.message ?? '').split('\n');
      const open = lines.findIndex((line) => line.startsWith('````yaml'));
      const close = lines.findIndex((line, i) => i > open && line === '````');
      const injected = lines.findIndex((line) => line.includes('injected'));
      expect(open).toBeGreaterThan(-1);
      expect(injected).toBeGreaterThan(open);
      expect(injected).toBeLessThan(close);
    });

    it.each([
      ['a recursive alias', 'name: &a\n  b: *a\nsteps:\n  - name: log\n    type: console\n'],
      [
        'too many aliases',
        [
          'a: &a [x, x, x, x, x, x, x, x, x, x]',
          ...'bcdefghij'.split('').map((key, i) => {
            const prev = 'abcdefghij'[i];
            return `${key}: &${key} [*${prev}, *${prev}, *${prev}, *${prev}, *${prev}, *${prev}, *${prev}, *${prev}, *${prev}, *${prev}]`;
          }),
          'steps:\n  - name: log\n    type: console',
        ].join('\n'),
      ],
    ])('returns an error result for %s instead of throwing', async (_label, yaml) => {
      const result = await invokeHandler(
        registeredTool,
        { stepName: 'log', yaml },
        createMockContext(undefined, { executionMode: AgentExecutionMode.conversation })
      );

      expect(result.results[0].data).toEqual({
        success: false,
        error: expect.stringContaining('Invalid workflow YAML'),
      });
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
