/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { RunContext } from '@kbn/agent-builder-server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ToolType } from '@kbn/agent-builder-common';
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
});
