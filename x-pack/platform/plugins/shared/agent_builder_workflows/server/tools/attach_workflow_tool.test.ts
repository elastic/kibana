/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ToolResultType } from '@kbn/agent-builder-common';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import {
  attachSavedWorkflowToConversation,
  registerAttachWorkflowTool,
} from './attach_workflow_tool';

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerAttachWorkflowTool', () => {
  let registeredTool: BuiltinToolDefinition;

  const mockApi = {
    getWorkflow: jest.fn(),
  } as any;

  const mockSecurity = {
    authz: {
      actions: {
        api: {
          get: jest.fn((action: string) => action),
        },
      },
      checkPrivilegesWithRequest: jest.fn(),
    },
  } as any;

  const getSecurity = () => mockSecurity;

  const workflow = {
    id: 'wf-support-cases',
    name: 'Support cases KI',
    description: 'Bottom-up KIs for support tickets',
    enabled: true,
    yaml: 'version: "1"\nname: Support cases KI\n',
  };

  const createAttachmentsMock = () => ({
    getAttachmentRecord: jest.fn().mockReturnValue(undefined),
    add: jest.fn().mockResolvedValue({ id: 'wf-support-cases', current_version: 1 }),
    updateOrigin: jest.fn().mockResolvedValue(true),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockSecurity.authz.checkPrivilegesWithRequest.mockReturnValue({
      atSpace: jest.fn().mockReturnValue({
        hasAllRequested: true,
      }),
    });

    mockApi.getWorkflow.mockResolvedValue(workflow);

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;

    registerAttachWorkflowTool(agentBuilder, mockApi, getSecurity);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.attach_workflow');
  });

  it('creates a workflow attachment', async () => {
    const attachments = createAttachmentsMock();
    const context = {
      spaceId: 'default',
      request: { headers: {} },
      attachments,
    } as any;

    const result = await invokeHandler(registeredTool, { workflowId: 'wf-support-cases' }, context);

    expect(attachments.add).toHaveBeenCalledWith(
      {
        id: 'wf-support-cases',
        type: WORKFLOW_YAML_ATTACHMENT_TYPE,
        data: {
          yaml: workflow.yaml,
          workflowId: workflow.id,
          name: workflow.name,
        },
        origin: 'wf-support-cases',
        description: workflow.name,
      },
      ATTACHMENT_REF_ACTOR.agent
    );
    expect(result.results[0]).toEqual({
      type: ToolResultType.other,
      data: {
        attachmentId: 'wf-support-cases',
        reusedExistingAttachment: false,
      },
    });
  });

  it('reuses an existing workflow attachment instead of overwriting it', async () => {
    const attachments = createAttachmentsMock();
    attachments.getAttachmentRecord.mockReturnValue({
      id: 'wf-support-cases',
      type: WORKFLOW_YAML_ATTACHMENT_TYPE,
      origin: undefined,
    });
    const context = {
      spaceId: 'default',
      request: { headers: {} },
      attachments,
    } as any;

    const result = await invokeHandler(registeredTool, { workflowId: 'wf-support-cases' }, context);

    expect(attachments.add).not.toHaveBeenCalled();
    expect(attachments.updateOrigin).toHaveBeenCalledWith(
      'wf-support-cases',
      'wf-support-cases',
      ATTACHMENT_REF_ACTOR.agent
    );
    expect(result.results[0]).toEqual({
      type: ToolResultType.other,
      data: expect.objectContaining({
        attachmentId: 'wf-support-cases',
        reusedExistingAttachment: true,
      }),
    });
  });

  it('returns an error when attach would collide with a non-workflow attachment id', async () => {
    const attachments = createAttachmentsMock();
    attachments.getAttachmentRecord.mockReturnValue({
      id: 'wf-support-cases',
      type: 'ai_index',
    });
    const context = {
      spaceId: 'default',
      request: { headers: {} },
      attachments,
    } as any;

    const result = await invokeHandler(registeredTool, { workflowId: 'wf-support-cases' }, context);

    expect(result.results[0]?.type).toBe(ToolResultType.error);
    expect(attachments.add).not.toHaveBeenCalled();
  });

  it('returns an error when the workflow is not found', async () => {
    mockApi.getWorkflow.mockResolvedValue(null);
    const context = {
      spaceId: 'default',
      request: { headers: {} },
      attachments: createAttachmentsMock(),
    } as any;

    const result = await invokeHandler(registeredTool, { workflowId: 'wf-missing' }, context);

    expect(result.results[0]?.type).toBe(ToolResultType.error);
  });

  it('returns an error when the caller lacks read privilege', async () => {
    mockSecurity.authz.checkPrivilegesWithRequest.mockReturnValue({
      atSpace: jest.fn().mockReturnValue({
        hasAllRequested: false,
      }),
    });

    const context = {
      spaceId: 'default',
      request: { headers: {} },
      attachments: createAttachmentsMock(),
    } as any;

    const result = await invokeHandler(registeredTool, { workflowId: 'wf-support-cases' }, context);

    expect(mockApi.getWorkflow).not.toHaveBeenCalled();
    expect(result.results[0]?.type).toBe(ToolResultType.error);
  });
});

describe('attachSavedWorkflowToConversation', () => {
  const workflow = {
    id: 'wf-support-cases',
    name: 'Support cases KI',
    description: 'Bottom-up KIs for support tickets',
    enabled: true,
    yaml: 'version: "1"\nname: Support cases KI\n',
  };

  it('adds a new workflow attachment with origin', async () => {
    const attachments = {
      getAttachmentRecord: jest.fn().mockReturnValue(undefined),
      add: jest.fn().mockResolvedValue({ id: 'wf-support-cases' }),
      updateOrigin: jest.fn(),
    } as any;

    const result = await attachSavedWorkflowToConversation({
      workflowId: 'wf-support-cases',
      workflow,
      attachments,
    });

    expect(result).toEqual({
      attachmentId: 'wf-support-cases',
      reusedExistingAttachment: false,
    });
    expect(attachments.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'wf-support-cases',
        origin: 'wf-support-cases',
      }),
      ATTACHMENT_REF_ACTOR.agent
    );
  });
});
