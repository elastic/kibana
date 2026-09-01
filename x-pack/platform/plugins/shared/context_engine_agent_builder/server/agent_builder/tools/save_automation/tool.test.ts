/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../../../common/agent_builder_attachments';
import { CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID } from '../../../../common/agent_builder_tools';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createSaveAutomationTool } from './tool';

jest.mock('@kbn/agent-builder-tools-base/workflows', () => ({
  hasWorkflowReadPrivilege: jest.fn().mockResolvedValue(true),
}));

const { hasWorkflowReadPrivilege } = jest.requireMock('@kbn/agent-builder-tools-base/workflows');

describe('save_automation tool', () => {
  const getWorkflowMock = jest.fn();

  const createTool = () =>
    createSaveAutomationTool({
      getAiIndexService: async () => {
        throw new Error('not used');
      },
      getCoreStart: async () => {
        throw new Error('not used');
      },
      getSecurityStart: async () => undefined,
      getWorkflowsManagement: () =>
        ({
          getWorkflow: getWorkflowMock,
        } as never),
    });

  const createAttachments = (): AttachmentStateManager =>
    ({
      getAll: jest.fn().mockReturnValue([
        {
          id: 'attachment-1',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          current_version: 1,
          versions: [
            {
              version: 1,
              data: {
                yaml: 'name: Index Metadata Pilot\nsteps: []',
                name: 'Index Metadata Pilot',
              },
            },
          ],
        },
        {
          id: 'ai-index-attachment',
          type: AI_INDEX_ATTACHMENT_TYPE,
          current_version: 1,
          versions: [
            {
              version: 1,
              data: {
                id: 'my-ai-index',
                description: 'Support tickets index',
              },
            },
          ],
        },
      ]),
    } as unknown as AttachmentStateManager);

  const createConfirmationContext = (
    toolParams: {
      workflowAttachmentId?: string;
      workflowId?: string;
      aiIndexId?: string;
    },
    attachments: AttachmentStateManager = createAttachments(),
    spaceId = 'default'
  ) => {
    const handlerContext = agentBuilderMocks.tools.createHandlerContext();
    return {
      toolParams,
      context: {
        ...handlerContext,
        attachments,
        request: httpServerMock.createKibanaRequest(),
        spaceId,
      },
    };
  };

  beforeEach(() => {
    getWorkflowMock.mockReset();
    hasWorkflowReadPrivilege.mockResolvedValue(true);
  });

  it('uses the expected tool id', () => {
    expect(createTool().id).toBe(CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID);
  });

  it('uses always confirmation policy with workflow and ai index names', async () => {
    const tool = createTool();
    const attachments = createAttachments();

    expect(tool.confirmation?.askUser).toBe('always');

    const draftConfirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext(
        {
          workflowAttachmentId: 'attachment-1',
          aiIndexId: 'my-ai-index',
        },
        attachments
      )
    );

    expect(draftConfirmation).toEqual(
      expect.objectContaining({
        title: 'Save workflow automation',
        confirm_text: 'Save and attach',
        cancel_text: 'Cancel',
      })
    );
    expect(draftConfirmation?.message).toContain('workflow "Index Metadata Pilot"');
    expect(draftConfirmation?.message).toContain('AI index "Support tickets index"');
    expect(draftConfirmation?.message).not.toContain('attachment-1');
  });

  it('falls back to workflow id when the saved workflow name cannot be resolved', async () => {
    const tool = createTool();
    getWorkflowMock.mockResolvedValue(undefined);

    const savedConfirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext({
        workflowId: 'workflow-1',
      })
    );

    expect(savedConfirmation?.message).toContain('workflow "workflow-1"');
    expect(getWorkflowMock).toHaveBeenCalledWith('workflow-1', 'default');
  });

  it('uses the saved workflow name when workflowId is provided', async () => {
    const tool = createTool();
    getWorkflowMock.mockResolvedValue({ id: 'workflow-1', name: 'Existing Pilot' });

    const savedConfirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext({
        workflowId: 'workflow-1',
      })
    );

    expect(savedConfirmation?.message).toContain('workflow "Existing Pilot"');
  });

  it('does not resolve workflow names without read privilege', async () => {
    hasWorkflowReadPrivilege.mockResolvedValue(false);
    const tool = createTool();
    getWorkflowMock.mockResolvedValue({ id: 'workflow-1', name: 'Secret Workflow' });

    const savedConfirmation = await tool.confirmation?.getConfirmation?.(
      createConfirmationContext({
        workflowId: 'workflow-1',
      })
    );

    expect(savedConfirmation?.message).toContain('workflow "workflow-1"');
    expect(savedConfirmation?.message).not.toContain('Secret Workflow');
    expect(getWorkflowMock).not.toHaveBeenCalled();
  });
});
