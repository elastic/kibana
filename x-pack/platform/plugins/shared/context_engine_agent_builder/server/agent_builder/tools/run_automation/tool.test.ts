/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { CONTEXT_ENGINE_RUN_AUTOMATION_TOOL_ID } from '../../../../common/agent_builder_tools';
import { createRunAutomationTool } from './tool';

jest.mock('@kbn/agent-builder-tools-base/workflows', () => ({
  hasWorkflowReadPrivilege: jest.fn().mockResolvedValue(true),
  hasWorkflowExecutePrivilege: jest.fn().mockResolvedValue(true),
  hasWorkflowUpdatePrivilege: jest.fn().mockResolvedValue(true),
}));

const { hasWorkflowReadPrivilege, hasWorkflowExecutePrivilege, hasWorkflowUpdatePrivilege } =
  jest.requireMock('@kbn/agent-builder-tools-base/workflows');

describe('run_automation tool', () => {
  const getWorkflowMock = jest.fn();

  const createTool = () =>
    createRunAutomationTool({
      getCoreStart: async () => {
        throw new Error('not used in confirmation');
      },
      getSecurityStart: async () => undefined,
      getWorkflowsManagement: () =>
        ({
          getWorkflow: getWorkflowMock,
        } as never),
    });

  const createConfirmationContext = (toolParams: { workflowId: string }, spaceId = 'default') => {
    const handlerContext = agentBuilderMocks.tools.createHandlerContext();
    return {
      toolParams,
      context: {
        ...handlerContext,
        request: httpServerMock.createKibanaRequest(),
        spaceId,
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    hasWorkflowReadPrivilege.mockResolvedValue(true);
    hasWorkflowExecutePrivilege.mockResolvedValue(true);
    hasWorkflowUpdatePrivilege.mockResolvedValue(true);
    getWorkflowMock.mockResolvedValue(undefined);
  });

  it('uses the expected tool id', () => {
    expect(createTool().id).toBe(CONTEXT_ENGINE_RUN_AUTOMATION_TOOL_ID);
  });

  it('always asks the user before running', () => {
    expect(createTool().confirmation?.askUser).toBe('always');
  });

  it('returns a generic confirmation when workflowId is empty', async () => {
    const tool = createTool();
    const confirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext({ workflowId: '' })
    );

    expect(confirmation).toEqual(
      expect.objectContaining({
        title: 'Run workflow automation',
        confirm_text: 'Run automation',
        cancel_text: 'Cancel',
      })
    );
  });

  it('shows the workflow name in the confirmation message', async () => {
    getWorkflowMock.mockResolvedValue({ id: 'wf-1', name: 'Nightly Enrichment', enabled: true });

    const tool = createTool();
    const confirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext({ workflowId: 'wf-1' })
    );

    expect(confirmation?.message).toContain('"Nightly Enrichment"');
    expect(confirmation?.confirm_text).toBe('Run automation');
  });

  it('falls back to the workflow id when the name cannot be read', async () => {
    hasWorkflowReadPrivilege.mockResolvedValue(false);

    const tool = createTool();
    const confirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext({ workflowId: 'wf-1' })
    );

    expect(confirmation?.message).toContain('workflow "wf-1"');
    expect(getWorkflowMock).not.toHaveBeenCalled();
  });

  it('shows an unauthorized message and only OK when the user cannot execute', async () => {
    hasWorkflowExecutePrivilege.mockResolvedValue(false);
    getWorkflowMock.mockResolvedValue({ id: 'wf-1', name: 'Nightly Enrichment', enabled: true });

    const tool = createTool();
    const confirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext({ workflowId: 'wf-1' })
    );

    expect(confirmation?.message).toContain('do not have permission');
    expect(confirmation?.confirm_text).toBe('OK');
  });

  describe('enable side effect notice', () => {
    it('warns that a disabled workflow will be enabled when the user has update privilege', async () => {
      getWorkflowMock.mockResolvedValue({ id: 'wf-1', name: 'Nightly Enrichment', enabled: false });

      const tool = createTool();
      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({ workflowId: 'wf-1' })
      );

      expect(confirmation?.message).toContain('currently disabled');
      expect(confirmation?.message).toContain('will be enabled in order to run');
      expect(confirmation?.confirm_text).toBe('Run automation');
    });

    it('warns that a disabled workflow cannot be run when the user lacks update privilege', async () => {
      getWorkflowMock.mockResolvedValue({ id: 'wf-1', name: 'Nightly Enrichment', enabled: false });
      hasWorkflowUpdatePrivilege.mockResolvedValue(false);

      const tool = createTool();
      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({ workflowId: 'wf-1' })
      );

      expect(confirmation?.message).toContain('disabled');
      expect(confirmation?.message).toContain('do not have permission to enable it');
      expect(confirmation?.message).toContain('cannot be run');
    });

    it('uses conditional language when the workflow state is unknown (no read privilege)', async () => {
      hasWorkflowReadPrivilege.mockResolvedValue(false);

      const tool = createTool();
      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({ workflowId: 'wf-1' })
      );

      expect(confirmation?.message).toContain('If the workflow is disabled');
      expect(confirmation?.message).toContain('will be enabled in order to run');
      expect(confirmation?.message).not.toContain('currently disabled');
    });

    it('adds no enable notice for an already-enabled workflow', async () => {
      getWorkflowMock.mockResolvedValue({ id: 'wf-1', name: 'Nightly Enrichment', enabled: true });

      const tool = createTool();
      const confirmation = await tool.confirmation?.getConfirmation?.(
        createConfirmationContext({ workflowId: 'wf-1' })
      );

      expect(confirmation?.message).not.toContain('disabled');
      expect(confirmation?.message).not.toContain('enabled');
    });
  });
});
