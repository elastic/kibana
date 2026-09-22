/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeWorkflow } from '@kbn/agent-builder-tools-base/workflows';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { ExecutionStatus } from '@kbn/workflows';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { executeWorkflowTool } from './execute_workflow';

jest.mock('@kbn/agent-builder-tools-base/workflows', () => {
  const actual = jest.requireActual('@kbn/agent-builder-tools-base/workflows');
  return {
    ...actual,
    executeWorkflow: jest.fn(),
  };
});

const executeWorkflowMock = executeWorkflow as jest.MockedFunction<typeof executeWorkflow>;

// Security plugin disabled by default in these tests -> privilege checks allow.
const getSecurity = () => undefined;

const invokeHandler = async (
  tool: ReturnType<typeof executeWorkflowTool>,
  input: unknown,
  context: unknown
) => (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('executeWorkflowTool', () => {
  const workflowsManagement = {
    management: { __mock: 'workflowsApi' },
  } as any;

  const successExecution = {
    execution_id: 'exec-1',
    status: ExecutionStatus.COMPLETED,
    workflow_id: 'wf-1',
    started_at: '2025-01-01T00:00:00.000Z',
    finished_at: '2025-01-01T00:00:01.000Z',
    workflow_name: 'Test Workflow',
  };

  const buildContext = (overrides: Partial<{ get: jest.Mock }> = {}) =>
    ({
      request: { __mock: 'request' },
      spaceId: 'default',
      attachments: {
        get: overrides.get ?? jest.fn(),
      },
    } as any);

  beforeEach(() => {
    executeWorkflowMock.mockReset();
  });

  it('executes a saved workflow when only `workflowId` is provided', async () => {
    executeWorkflowMock.mockResolvedValueOnce({ success: true, execution: successExecution });
    const tool = executeWorkflowTool({ workflowsManagement, getSecurity });

    const result = await invokeHandler(
      tool,
      { workflowId: 'wf-1', inputs: { a: 1 } },
      buildContext()
    );

    expect(executeWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'wf-1',
        workflowParams: { a: 1 },
        workflowApi: workflowsManagement.management,
        spaceId: 'default',
        waitForCompletion: true,
      })
    );
    expect(result.results[0]).toEqual({
      type: 'other',
      data: { execution: successExecution },
    });
  });

  it('does not execute a saved workflow when the caller lacks execute privilege', async () => {
    const atSpace = jest.fn().mockResolvedValue({ hasAllRequested: false });
    const denyingSecurity = () =>
      ({
        authz: {
          actions: { api: { get: (a: string) => `api:${a}` } },
          checkPrivilegesWithRequest: () => ({ atSpace }),
        },
      } as any);
    const tool = executeWorkflowTool({ workflowsManagement, getSecurity: denyingSecurity });

    const result = await invokeHandler(tool, { workflowId: 'wf-1', inputs: {} }, buildContext());

    expect(executeWorkflowMock).not.toHaveBeenCalled();
    expect(result.results[0]).toEqual(expect.objectContaining({ type: 'error' }));
  });

  it('executes an inline yaml workflow when only `yaml` is provided', async () => {
    executeWorkflowMock.mockResolvedValueOnce({ success: true, execution: successExecution });
    const tool = executeWorkflowTool({ workflowsManagement, getSecurity });

    await invokeHandler(
      tool,
      { yaml: 'version: "1"\nname: inline\ntriggers:\n  - type: manual\nsteps: []\n' },
      buildContext()
    );

    expect(executeWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        yaml: 'version: "1"\nname: inline\ntriggers:\n  - type: manual\nsteps: []\n',
        workflowId: undefined,
        name: undefined,
        workflowParams: {},
      })
    );
  });

  it('resolves and executes a workflow yaml attachment when only `attachmentId` is provided', async () => {
    executeWorkflowMock.mockResolvedValueOnce({ success: true, execution: successExecution });

    const get = jest.fn().mockReturnValue({
      id: 'att-1',
      version: 1,
      type: WORKFLOW_YAML_ATTACHMENT_TYPE,
      data: {
        data: {
          yaml: 'version: "1"\nname: from-attachment\ntriggers:\n  - type: manual\nsteps: []\n',
          workflowId: 'saved-or-pending',
          name: 'from-attachment',
        },
      },
    });
    const tool = executeWorkflowTool({ workflowsManagement, getSecurity });

    await invokeHandler(tool, { attachmentId: 'att-1', inputs: { b: 2 } }, buildContext({ get }));

    expect(get).toHaveBeenCalledWith('att-1');
    expect(executeWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        yaml: 'version: "1"\nname: from-attachment\ntriggers:\n  - type: manual\nsteps: []\n',
        workflowId: 'saved-or-pending',
        name: 'from-attachment',
        workflowParams: { b: 2 },
      })
    );
  });

  it('forwards `waitForCompletion: false`', async () => {
    executeWorkflowMock.mockResolvedValueOnce({ success: true, execution: successExecution });
    const tool = executeWorkflowTool({ workflowsManagement, getSecurity });

    await invokeHandler(tool, { workflowId: 'wf-1', waitForCompletion: false }, buildContext());

    expect(executeWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({ waitForCompletion: false })
    );
  });

  it('returns an error result when zero modes are provided', async () => {
    const tool = executeWorkflowTool({ workflowsManagement, getSecurity });
    const result = await invokeHandler(tool, {}, buildContext());
    expect(executeWorkflowMock).not.toHaveBeenCalled();
    expect(result.results[0].type).toBe('error');
    expect(JSON.stringify(result.results[0])).toContain('Exactly one');
  });

  it('returns an error result when two modes are provided', async () => {
    const tool = executeWorkflowTool({ workflowsManagement, getSecurity });
    const result = await invokeHandler(
      tool,
      {
        workflowId: 'wf-1',
        yaml: 'version: "1"\nname: x\ntriggers:\n  - type: manual\nsteps: []\n',
      },
      buildContext()
    );
    expect(executeWorkflowMock).not.toHaveBeenCalled();
    expect(result.results[0].type).toBe('error');
  });

  it('returns an error result when all three modes are provided', async () => {
    const tool = executeWorkflowTool({ workflowsManagement, getSecurity });
    const result = await invokeHandler(
      tool,
      {
        workflowId: 'wf-1',
        yaml: 'version: "1"\nname: x\ntriggers:\n  - type: manual\nsteps: []\n',
        attachmentId: 'att-1',
      },
      buildContext()
    );
    expect(executeWorkflowMock).not.toHaveBeenCalled();
    expect(result.results[0].type).toBe('error');
  });

  it('returns an error result when the attachment is missing', async () => {
    const tool = executeWorkflowTool({ workflowsManagement, getSecurity });
    const result = await invokeHandler(
      tool,
      { attachmentId: 'missing' },
      buildContext({ get: jest.fn().mockReturnValue(undefined) })
    );
    expect(executeWorkflowMock).not.toHaveBeenCalled();
    expect(result.results[0].type).toBe('error');
    expect(JSON.stringify(result.results[0])).toContain('not found');
  });

  it('returns an error result when the attachment is not a workflow yaml attachment', async () => {
    const tool = executeWorkflowTool({ workflowsManagement, getSecurity });
    const result = await invokeHandler(
      tool,
      { attachmentId: 'att-wrong' },
      buildContext({
        get: jest.fn().mockReturnValue({
          id: 'att-wrong',
          version: 1,
          type: 'something_else',
          data: { data: {} },
        }),
      })
    );
    expect(executeWorkflowMock).not.toHaveBeenCalled();
    expect(result.results[0].type).toBe('error');
    expect(JSON.stringify(result.results[0])).toContain('not a workflow attachment');
  });

  it('returns an error result when the helper reports failure', async () => {
    executeWorkflowMock.mockResolvedValueOnce({ success: false, error: 'boom' });
    const tool = executeWorkflowTool({ workflowsManagement, getSecurity });
    const result = await invokeHandler(tool, { workflowId: 'wf-1' }, buildContext());
    expect(result.results[0].type).toBe('error');
    expect(JSON.stringify(result.results[0])).toContain('boom');
  });
});
