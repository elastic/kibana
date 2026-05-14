/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { ExecutionStatus } from '@kbn/workflows';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import { resumeWorkflowExecutionTool } from './resume_workflow_execution';

jest.mock('@kbn/agent-builder-tools-base/workflows', () => ({
  getExecutionState: jest.fn(),
}));

const { getExecutionState } = jest.requireMock('@kbn/agent-builder-tools-base/workflows');

describe('resumeWorkflowExecutionTool', () => {
  const createWorkflowsManagement = () => ({
    management: {
      resumeWorkflowExecution: jest.fn().mockResolvedValue(undefined),
      getWorkflowExecution: jest.fn(),
    },
  });

  const mockContext = {
    spaceId: 'default',
    request: {} as KibanaRequest,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have the correct tool id', () => {
    const tool = resumeWorkflowExecutionTool({
      workflowsManagement: createWorkflowsManagement() as any,
    });
    expect(tool.id).toBe(platformCoreTools.resumeWorkflowExecution);
  });

  it('should call resumeWorkflowExecution with correct params', async () => {
    const wm = createWorkflowsManagement();
    const tool = resumeWorkflowExecutionTool({ workflowsManagement: wm as any });

    getExecutionState.mockResolvedValue({
      execution_id: 'exec-1',
      status: ExecutionStatus.RUNNING,
    });

    await tool.handler({ executionId: 'exec-1', input: { approved: true } }, mockContext as any);

    expect(wm.management.resumeWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default',
      { approved: true },
      mockContext.request
    );
  });

  it('passes expectedResumeSeq when expected_resume_seq is provided', async () => {
    const wm = createWorkflowsManagement();
    const tool = resumeWorkflowExecutionTool({ workflowsManagement: wm as any });

    getExecutionState.mockResolvedValue({
      execution_id: 'exec-1',
      status: ExecutionStatus.RUNNING,
    });

    await tool.handler(
      { executionId: 'exec-1', expected_resume_seq: 2, input: { approved: true } },
      mockContext as any
    );

    expect(wm.management.resumeWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default',
      { approved: true },
      mockContext.request,
      { expectedResumeSeq: 2 }
    );
  });

  it('should return resumed state on success', async () => {
    const wm = createWorkflowsManagement();
    const tool = resumeWorkflowExecutionTool({ workflowsManagement: wm as any });

    const executionState = {
      execution_id: 'exec-1',
      status: ExecutionStatus.COMPLETED,
      output: { result: 'done' },
    };
    getExecutionState.mockResolvedValue(executionState);

    const result = await tool.handler(
      { executionId: 'exec-1', input: { approved: true } },
      mockContext as any
    );

    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: {
            resumed: true,
            execution: executionState,
          },
        },
      ],
    });
  });

  it('should return error result when resume fails', async () => {
    const wm = createWorkflowsManagement();
    wm.management.resumeWorkflowExecution.mockRejectedValue(
      new Error('Execution not in WAITING_FOR_INPUT status')
    );
    const tool = resumeWorkflowExecutionTool({ workflowsManagement: wm as any });

    const result = await tool.handler({ executionId: 'exec-1', input: {} }, mockContext as any);

    expect(result).toEqual({
      results: [
        {
          type: 'error',
          data: {
            message:
              'Failed to resume workflow execution: Execution not in WAITING_FOR_INPUT status',
          },
        },
      ],
    });
  });

  it('should return resumed: true with fallback when state fetch throws after a successful resume', async () => {
    const wm = createWorkflowsManagement();
    const tool = resumeWorkflowExecutionTool({ workflowsManagement: wm as any });
    getExecutionState.mockRejectedValue(new Error('timeout'));

    const result = await tool.handler(
      { executionId: 'exec-1', input: { approved: true } },
      mockContext as any
    );

    // Resume succeeded — must not surface an error that would cause the LLM to retry.
    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: {
            resumed: true,
            execution: { execution_id: 'exec-1', status: 'unknown' },
          },
        },
      ],
    });
  });

  it('should handle null execution state after resume', async () => {
    const wm = createWorkflowsManagement();
    const tool = resumeWorkflowExecutionTool({ workflowsManagement: wm as any });
    getExecutionState.mockResolvedValue(null);

    const result = await tool.handler(
      { executionId: 'exec-1', input: { val: 1 } },
      mockContext as any
    );

    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: {
            resumed: true,
            execution: { execution_id: 'exec-1', status: 'unknown' },
          },
        },
      ],
    });
  });

  describe('inboxEnabled HITL emission', () => {
    const waitingInputExecution = {
      execution_id: 'exec-1',
      status: ExecutionStatus.WAITING_FOR_INPUT,
      waiting_input: {
        agent_context: {
          reasoning: 'needs approval',
          intended_tool: 'none',
          intended_tool_args: {},
        },
        message: 'Please confirm the action',
        schema: { type: 'object', properties: { confirmed: { type: 'boolean' } } },
        step_execution_id: 'step-exec-2',
      },
    };

    it('returns a combined results+prompt return when inboxEnabled and execution is WAITING_FOR_INPUT', async () => {
      const wm = createWorkflowsManagement();
      const tool = resumeWorkflowExecutionTool({
        inboxEnabled: true,
        workflowsManagement: wm as any,
      });
      getExecutionState.mockResolvedValue(waitingInputExecution);

      const result = await tool.handler(
        { executionId: 'exec-1', input: { approved: true } },
        mockContext as any
      );

      expect(result).toMatchObject({
        prompt: {
          type: AgentPromptType.form,
          execution_id: 'exec-1',
          step_execution_id: 'step-exec-2',
          message: 'Please confirm the action',
          schema: { type: 'object', properties: { confirmed: { type: 'boolean' } } },
          agent_context: {
            reasoning: 'needs approval',
            intended_tool: 'none',
            intended_tool_args: {},
          },
        },
        results: [
          {
            type: 'other',
            data: {
              resumed: true,
              execution: waitingInputExecution,
            },
          },
        ],
      });
    });

    it('prompt.id equals step_execution_id so handle_form_prompt can filter the old prompt', async () => {
      const wm = createWorkflowsManagement();
      const tool = resumeWorkflowExecutionTool({
        inboxEnabled: true,
        workflowsManagement: wm as any,
      });
      getExecutionState.mockResolvedValue(waitingInputExecution);

      const result = (await tool.handler(
        { executionId: 'exec-1', input: { approved: true } },
        mockContext as any
      )) as any;

      expect(result.prompt?.id).toBe('step-exec-2');
      expect(result.prompt?.id).toBe(result.prompt?.step_execution_id);
    });

    it('omits agent_context from prompt when waiting_input has no agent_context', async () => {
      const wm = createWorkflowsManagement();
      const tool = resumeWorkflowExecutionTool({
        inboxEnabled: true,
        workflowsManagement: wm as any,
      });
      const execNoContext = {
        ...waitingInputExecution,
        waiting_input: {
          message: 'Please confirm',
          schema: {},
          step_execution_id: 'step-exec-2',
        },
      };
      getExecutionState.mockResolvedValue(execNoContext);

      const result = (await tool.handler(
        { executionId: 'exec-1', input: { approved: true } },
        mockContext as any
      )) as any;

      expect(result.prompt?.agent_context).toBeUndefined();
    });

    it('returns standard results only when inboxEnabled is false and execution is WAITING_FOR_INPUT', async () => {
      const wm = createWorkflowsManagement();
      const tool = resumeWorkflowExecutionTool({
        inboxEnabled: false,
        workflowsManagement: wm as any,
      });
      getExecutionState.mockResolvedValue(waitingInputExecution);

      const result = (await tool.handler(
        { executionId: 'exec-1', input: { approved: true } },
        mockContext as any
      )) as any;

      expect(result.prompt).toBeUndefined();
      expect(result.results).toHaveLength(1);
    });

    it('returns standard results only when inboxEnabled is not set and execution is WAITING_FOR_INPUT', async () => {
      const wm = createWorkflowsManagement();
      const tool = resumeWorkflowExecutionTool({ workflowsManagement: wm as any });
      getExecutionState.mockResolvedValue(waitingInputExecution);

      const result = (await tool.handler(
        { executionId: 'exec-1', input: { approved: true } },
        mockContext as any
      )) as any;

      expect(result.prompt).toBeUndefined();
    });

    it('returns standard results only when inboxEnabled is true but execution is COMPLETED', async () => {
      const wm = createWorkflowsManagement();
      const tool = resumeWorkflowExecutionTool({
        inboxEnabled: true,
        workflowsManagement: wm as any,
      });
      getExecutionState.mockResolvedValue({
        execution_id: 'exec-1',
        status: ExecutionStatus.COMPLETED,
      });

      const result = (await tool.handler(
        { executionId: 'exec-1', input: { approved: true } },
        mockContext as any
      )) as any;

      expect(result.prompt).toBeUndefined();
    });

    it('returns standard results only when inboxEnabled is true but execution is null', async () => {
      const wm = createWorkflowsManagement();
      const tool = resumeWorkflowExecutionTool({
        inboxEnabled: true,
        workflowsManagement: wm as any,
      });
      getExecutionState.mockResolvedValue(null);

      const result = (await tool.handler(
        { executionId: 'exec-1', input: { approved: true } },
        mockContext as any
      )) as any;

      expect(result.prompt).toBeUndefined();
    });
  });
});
