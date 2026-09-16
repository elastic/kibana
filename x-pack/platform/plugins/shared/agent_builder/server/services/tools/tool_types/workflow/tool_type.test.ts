/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { RunContext } from '@kbn/agent-builder-server';
import {
  isToolHandlerStandardReturn,
  type ToolHandlerContext,
} from '@kbn/agent-builder-server/tools';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ToolType, ToolResultType, isForbiddenError } from '@kbn/agent-builder-common';
import { getWorkflowToolType } from './tool_type';
import { isEnabledDefinition, isDisabledDefinition } from '../definitions';
import {
  executeWorkflow,
  hasWorkflowReadPrivilege,
  hasWorkflowExecutePrivilege,
} from '@kbn/agent-builder-tools-base/workflows';

jest.mock('@kbn/agent-builder-tools-base/workflows', () => ({
  executeWorkflow: jest.fn(),
  hasWorkflowReadPrivilege: jest.fn(),
  hasWorkflowExecutePrivilege: jest.fn(),
}));

jest.mock('./validation', () => ({
  validateWorkflowId: jest.fn(),
}));

const executeWorkflowMock = executeWorkflow as jest.MockedFunction<typeof executeWorkflow>;
const hasReadMock = hasWorkflowReadPrivilege as jest.MockedFunction<
  typeof hasWorkflowReadPrivilege
>;
const hasExecuteMock = hasWorkflowExecutePrivilege as jest.MockedFunction<
  typeof hasWorkflowExecutePrivilege
>;

const security = undefined;

describe('workflow tool type', () => {
  const mockWorkflowsManagement = {
    management: {} as WorkflowsServerPluginSetup['management'],
  } as WorkflowsServerPluginSetup;

  beforeEach(() => {
    // Allow by default; individual tests override to test denials.
    hasReadMock.mockResolvedValue(true);
    hasExecuteMock.mockResolvedValue(true);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns disabled when workflowsManagement is not provided', () => {
    const toolType = getWorkflowToolType({ workflowsManagement: undefined, security });
    expect(isDisabledDefinition(toolType)).toBe(true);
  });

  it('returns enabled when workflowsManagement is provided', () => {
    const toolType = getWorkflowToolType({
      workflowsManagement: mockWorkflowsManagement,
      security,
    });
    expect(isEnabledDefinition(toolType)).toBe(true);
    expect(toolType.toolType).toBe(ToolType.workflow);
  });

  describe('authorization', () => {
    const config = { workflow_id: 'wf-123', wait_for_completion: true };
    const request = httpServerMock.createKibanaRequest();

    beforeEach(() => {
      executeWorkflowMock.mockResolvedValue({
        success: true,
        execution: { status: 'completed' } as any,
      });
    });

    const getHandler = async () => {
      const toolType = getWorkflowToolType({
        workflowsManagement: mockWorkflowsManagement,
        security,
      });
      if (!isEnabledDefinition(toolType)) throw new Error('Expected enabled');
      const dynamicProps = await toolType.getDynamicProps(config, { spaceId: 'default', request });
      return dynamicProps.getHandler();
    };

    it('does not execute the workflow when the caller lacks execute privilege', async () => {
      hasExecuteMock.mockResolvedValue(false);
      const handler = await getHandler();
      const runContext: RunContext = { runId: 'run-1', stack: [] };

      const result = await handler({}, { request, runContext } as unknown as ToolHandlerContext);

      expect(executeWorkflowMock).not.toHaveBeenCalled();
      if (!isToolHandlerStandardReturn(result)) {
        throw new Error('Expected a standard tool result');
      }
      expect(result.results[0].type).toBe(ToolResultType.error);
    });

    it('executes the workflow when the caller holds execute privilege', async () => {
      hasExecuteMock.mockResolvedValue(true);
      const handler = await getHandler();
      const runContext: RunContext = { runId: 'run-1', stack: [] };

      await handler({}, { request, runContext } as unknown as ToolHandlerContext);

      expect(executeWorkflowMock).toHaveBeenCalledTimes(1);
    });

    it('throws a forbidden error on create when the caller lacks read privilege', async () => {
      hasReadMock.mockResolvedValue(false);
      const toolType = getWorkflowToolType({
        workflowsManagement: mockWorkflowsManagement,
        security,
      });
      if (!isEnabledDefinition(toolType)) throw new Error('Expected enabled');

      let caught: unknown;
      try {
        await toolType.validateForCreate({
          config,
          context: { spaceId: 'default', request, esClient: {} as any },
        });
      } catch (e) {
        caught = e;
      }
      expect(isForbiddenError(caught)).toBe(true);
    });

    it('allows create when the caller holds read privilege', async () => {
      hasReadMock.mockResolvedValue(true);
      const toolType = getWorkflowToolType({
        workflowsManagement: mockWorkflowsManagement,
        security,
      });
      if (!isEnabledDefinition(toolType)) throw new Error('Expected enabled');

      await expect(
        toolType.validateForCreate({
          config,
          context: { spaceId: 'default', request, esClient: {} as any },
        })
      ).resolves.toEqual(config);
    });
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

    it('passes metadata with agent_id when agent is in the run context stack', async () => {
      const toolType = getWorkflowToolType({
        workflowsManagement: mockWorkflowsManagement,
        security,
      });
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
      const toolType = getWorkflowToolType({
        workflowsManagement: mockWorkflowsManagement,
        security,
      });
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
      const toolType = getWorkflowToolType({
        workflowsManagement: mockWorkflowsManagement,
        security,
      });
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
