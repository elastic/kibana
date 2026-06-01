/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { RunContext } from '@kbn/agent-builder-server';
import type {
  ToolHandlerContext,
  ToolHandlerResultsWithPromptReturn,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { FormPromptRequest } from '@kbn/agent-builder-common/agents';
import { getWorkflowToolType } from './tool_type';
import { isEnabledDefinition, isDisabledDefinition } from '../definitions';
import { executeWorkflow } from '../../../workflow';

jest.mock('../../../workflow', () => ({
  executeWorkflow: jest.fn(),
}));

const executeWorkflowMock = executeWorkflow as jest.MockedFunction<typeof executeWorkflow>;

describe('workflow tool type', () => {
  const mockWorkflowsManagement = {
    management: {} as WorkflowsServerPluginSetup['management'],
  } as WorkflowsServerPluginSetup;

  it('returns disabled when workflowsManagement is not provided', () => {
    const toolType = getWorkflowToolType({ workflowsManagement: undefined });
    expect(isDisabledDefinition(toolType)).toBe(true);
  });

  it('returns enabled when workflowsManagement is provided', () => {
    const toolType = getWorkflowToolType({ workflowsManagement: mockWorkflowsManagement });
    expect(isEnabledDefinition(toolType)).toBe(true);
    expect(toolType.toolType).toBe(ToolType.workflow);
  });

  describe('handler metadata forwarding', () => {
    const config = { workflow_id: 'wf-123', wait_for_completion: true };
    const request = httpServerMock.createKibanaRequest();

    beforeEach(() => {
      executeWorkflowMock.mockResolvedValue({
        success: true,
        execution: { status: 'completed' } as any,
      });
    });

    afterEach(() => jest.clearAllMocks());

    it('passes metadata with agent_id when agent is in the run context stack', async () => {
      const toolType = getWorkflowToolType({ workflowsManagement: mockWorkflowsManagement });
      if (!isEnabledDefinition(toolType)) throw new Error('Expected enabled');

      const dynamicProps = await toolType.getDynamicProps(config, {
        spaceId: 'default',
        request,
      });
      const handler = await dynamicProps.getHandler();

      const runContext: RunContext = {
        runId: 'run-1',
        stack: [{ type: 'agent', agentId: 'agent-abc' }],
      };

      await handler({}, { request, runContext } as unknown as ToolHandlerContext);

      expect(executeWorkflowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { agent_id: 'agent-abc' },
        })
      );
    });

    it('passes undefined metadata when no agent is in the run context stack', async () => {
      const toolType = getWorkflowToolType({ workflowsManagement: mockWorkflowsManagement });
      if (!isEnabledDefinition(toolType)) throw new Error('Expected enabled');

      const dynamicProps = await toolType.getDynamicProps(config, {
        spaceId: 'default',
        request,
      });
      const handler = await dynamicProps.getHandler();

      const runContext: RunContext = {
        runId: 'run-1',
        stack: [{ type: 'tool', toolId: 'some-tool' }],
      };

      await handler({}, { request, runContext } as unknown as ToolHandlerContext);

      expect(executeWorkflowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: undefined,
        })
      );
    });

    it('picks the most recent agent from a nested stack', async () => {
      const toolType = getWorkflowToolType({ workflowsManagement: mockWorkflowsManagement });
      if (!isEnabledDefinition(toolType)) throw new Error('Expected enabled');

      const dynamicProps = await toolType.getDynamicProps(config, {
        spaceId: 'default',
        request,
      });
      const handler = await dynamicProps.getHandler();

      const runContext: RunContext = {
        runId: 'run-1',
        stack: [
          { type: 'agent', agentId: 'parent-agent' },
          { type: 'tool', toolId: 'some-tool' },
          { type: 'agent', agentId: 'child-agent' },
        ],
      };

      await handler({}, { request, runContext } as unknown as ToolHandlerContext);

      expect(executeWorkflowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { agent_id: 'child-agent' },
        })
      );
    });
  });

  describe('WAITING_FOR_INPUT handling', () => {
    const config = { workflow_id: 'wf-waiting', wait_for_completion: true };
    const mockLogger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() };
    const request = httpServerMock.createKibanaRequest();
    const runContext: RunContext = { runId: 'run-1', stack: [] };

    afterEach(() => jest.clearAllMocks());

    it('returns both otherResult and a form prompt when the workflow returns WAITING_FOR_INPUT', async () => {
      const waitingInputSchema = {
        type: 'object',
        properties: { approved: { type: 'boolean' } },
      };
      executeWorkflowMock.mockResolvedValue({
        success: true,
        execution: {
          execution_id: 'exec-123',
          status: 'waiting_for_input' as any,
          workflow_id: 'wf-waiting',
          started_at: '2024-01-01T00:00:00Z',
          waiting_input: {
            step_execution_id: 'step-456',
            message: 'Please approve the action',
            schema: waitingInputSchema,
          },
        },
      });

      const toolType = getWorkflowToolType({
        inboxEnabled: true,
        workflowsManagement: mockWorkflowsManagement,
      });
      if (!isEnabledDefinition(toolType)) throw new Error('Expected enabled');

      const dynamicProps = await toolType.getDynamicProps(config, { spaceId: 'default', request });
      const handler = await dynamicProps.getHandler();

      const result = await handler({}, {
        logger: mockLogger,
        request,
        runContext,
      } as unknown as ToolHandlerContext);
      const combined = result as ToolHandlerResultsWithPromptReturn<ToolResult>;

      expect(combined.results).toHaveLength(1);
      expect(combined.results[0]).toMatchObject({
        type: ToolResultType.other,
        data: { execution: expect.objectContaining({ execution_id: 'exec-123' }) },
      });

      expect(combined.prompt).toMatchObject({
        execution_id: 'exec-123',
        message: 'Please approve the action',
        schema: waitingInputSchema,
        step_execution_id: 'step-456',
        type: AgentPromptType.form,
      });
      expect(typeof combined.prompt.id).toBe('string');
      expect(combined.prompt.id.length).toBeGreaterThan(0);
    });

    it('uses empty string for message when waiting_input.message is absent', async () => {
      executeWorkflowMock.mockResolvedValue({
        success: true,
        execution: {
          execution_id: 'exec-no-msg',
          status: 'waiting_for_input' as any,
          workflow_id: 'wf-waiting',
          started_at: '2024-01-01T00:00:00Z',
          waiting_input: {
            step_execution_id: 'step-789',
          },
        },
      });

      const toolType = getWorkflowToolType({
        inboxEnabled: true,
        workflowsManagement: mockWorkflowsManagement,
      });
      if (!isEnabledDefinition(toolType)) throw new Error('Expected enabled');

      const dynamicProps = await toolType.getDynamicProps(config, { spaceId: 'default', request });
      const handler = await dynamicProps.getHandler();

      const result = await handler({}, {
        logger: mockLogger,
        request,
        runContext,
      } as unknown as ToolHandlerContext);
      const combined = result as ToolHandlerResultsWithPromptReturn<ToolResult>;

      expect(combined.prompt).toMatchObject({
        message: '',
        schema: {},
        step_execution_id: 'step-789',
        type: AgentPromptType.form,
      });
    });

    it('includes agent_context in the form prompt when waiting_input carries agent_context', async () => {
      const agentContext = {
        intended_tool: 'hitl.form.tool',
        intended_tool_args: { key: 'val' },
        reasoning: 'I need human approval',
      };
      executeWorkflowMock.mockResolvedValue({
        success: true,
        execution: {
          execution_id: 'exec-ctx',
          started_at: '2024-01-01T00:00:00Z',
          status: 'waiting_for_input' as any,
          waiting_input: {
            agent_context: agentContext,
            message: 'Please approve',
            schema: {},
            step_execution_id: 'step-ctx',
          },
          workflow_id: 'wf-ctx',
        },
      });

      const toolType = getWorkflowToolType({
        inboxEnabled: true,
        workflowsManagement: mockWorkflowsManagement,
      });
      if (!isEnabledDefinition(toolType)) throw new Error('Expected enabled');

      const dynamicProps = await toolType.getDynamicProps(config, { spaceId: 'default', request });
      const handler = await dynamicProps.getHandler();

      const result = await handler({}, {
        logger: mockLogger,
        request,
        runContext,
      } as unknown as ToolHandlerContext);
      const combined = result as ToolHandlerResultsWithPromptReturn<ToolResult>;

      expect((combined.prompt as FormPromptRequest)?.agent_context).toEqual(agentContext);
    });

    it('returns only otherResult (no prompt) when workflow completes without waiting', async () => {
      executeWorkflowMock.mockResolvedValue({
        success: true,
        execution: {
          execution_id: 'exec-done',
          status: 'completed' as any,
          workflow_id: 'wf-waiting',
          started_at: '2024-01-01T00:00:00Z',
          output: { result: 'ok' },
        },
      });

      const toolType = getWorkflowToolType({ workflowsManagement: mockWorkflowsManagement });
      if (!isEnabledDefinition(toolType)) throw new Error('Expected enabled');

      const dynamicProps = await toolType.getDynamicProps(config, { spaceId: 'default', request });
      const handler = await dynamicProps.getHandler();

      const result = await handler({}, { request, runContext } as unknown as ToolHandlerContext);
      const standard = result as ToolHandlerStandardReturn<ToolResult>;

      expect(standard.results).toHaveLength(1);
      expect(standard.results[0]).toMatchObject({ type: ToolResultType.other });
      expect((result as ToolHandlerResultsWithPromptReturn<ToolResult>).prompt).toBeUndefined();
    });

    it('returns only results (no prompt) when inboxEnabled is false and workflow returns WAITING_FOR_INPUT', async () => {
      executeWorkflowMock.mockResolvedValue({
        success: true,
        execution: {
          execution_id: 'exec-disabled',
          status: 'waiting_for_input' as any,
          workflow_id: 'wf-waiting',
          started_at: '2024-01-01T00:00:00Z',
          waiting_input: {
            step_execution_id: 'step-disabled',
            message: 'Should not surface',
            schema: {},
          },
        },
      });

      const toolType = getWorkflowToolType({
        inboxEnabled: false,
        workflowsManagement: mockWorkflowsManagement,
      });
      if (!isEnabledDefinition(toolType)) throw new Error('Expected enabled');

      const dynamicProps = await toolType.getDynamicProps(config, { spaceId: 'default', request });
      const handler = await dynamicProps.getHandler();

      const result = await handler({}, { request, runContext } as unknown as ToolHandlerContext);

      expect((result as ToolHandlerResultsWithPromptReturn<ToolResult>).prompt).toBeUndefined();
      expect((result as ToolHandlerStandardReturn<ToolResult>).results).toHaveLength(1);
    });

    it('emits [hitl-debug][ab] workflowTool.formPrompt debug marker when workflow returns WAITING_FOR_INPUT', async () => {
      executeWorkflowMock.mockResolvedValue({
        success: true,
        execution: {
          execution_id: 'exec-marker',
          status: 'waiting_for_input' as any,
          workflow_id: 'wf-waiting',
          started_at: '2024-01-01T00:00:00Z',
          waiting_input: {
            step_execution_id: 'step-789',
            message: 'Please approve',
            schema: { type: 'object', properties: { approved: { type: 'boolean' } } },
          },
        },
      });

      const toolType = getWorkflowToolType({
        inboxEnabled: true,
        workflowsManagement: mockWorkflowsManagement,
      });
      if (!isEnabledDefinition(toolType)) throw new Error('Expected enabled');

      const dynamicProps = await toolType.getDynamicProps(config, { spaceId: 'default', request });
      const handler = await dynamicProps.getHandler();

      await handler({}, {
        logger: mockLogger,
        request,
        runContext,
      } as unknown as ToolHandlerContext);

      // logger.debug uses lazy evaluation, so call the factory to get the string
      const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
      const messages = debugCalls.map((c: any[]) => (typeof c[0] === 'function' ? c[0]() : c[0]));
      const markerMsg = messages.find((m: string) =>
        m.includes('[hitl-debug][ab] workflowTool.formPrompt')
      );
      expect(markerMsg).toBeDefined();
      expect(markerMsg).toContain('schemaKeys=1');
      expect(markerMsg).toContain('messagePresent=true');
    });
  });
});
