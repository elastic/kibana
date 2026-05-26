/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateWorkflow } from '@kbn/agent-builder-workflow-gen';
import { ToolResultType } from '@kbn/agent-builder-common';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { generateWorkflowTool } from './generate_workflow';

jest.mock('@kbn/agent-builder-workflow-gen', () => ({
  generateWorkflow: jest.fn(),
}));

const generateWorkflowMock = generateWorkflow as jest.MockedFunction<typeof generateWorkflow>;

describe('generateWorkflowTool', () => {
  const workflowsManagement = {
    management: { __mock: 'workflowsApi' },
  } as any;

  const generatedWorkflow = {
    version: '1',
    name: 'foo',
    triggers: [{ type: 'manual' }],
    steps: [{ name: 's1', type: 'console', with: { message: 'hi' } }],
  };

  const buildContext = (
    overrides: Partial<{
      get: jest.Mock;
      add: jest.Mock;
      update: jest.Mock;
    }> = {}
  ) =>
    ({
      modelProvider: { getDefaultModel: jest.fn().mockResolvedValue({ id: 'model' }) },
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      request: { __mock: 'request' },
      spaceId: 'default',
      attachments: {
        get: overrides.get ?? jest.fn(),
        add: overrides.add ?? jest.fn().mockResolvedValue({ id: 'new-att', current_version: 1 }),
        update:
          overrides.update ?? jest.fn().mockResolvedValue({ id: 'src-att', current_version: 2 }),
      },
    } as any);

  beforeEach(() => {
    generateWorkflowMock.mockReset();
  });

  it('creates a new workflow attachment when no attachmentId is provided', async () => {
    generateWorkflowMock.mockResolvedValueOnce({
      workflow: generatedWorkflow,
      response: 'created the workflow',
    } as any);

    const context = buildContext();
    const tool = generateWorkflowTool({ workflowsManagement });
    const out = await tool.handler(
      { query: 'a workflow', context: 'ctx', instructions: 'inst' } as any,
      context
    );

    expect(generateWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nlQuery: 'a workflow',
        additionalContext: 'ctx',
        additionalInstructions: 'inst',
        spaceId: 'default',
        workflowsApi: workflowsManagement.management,
        workflow: undefined,
      })
    );

    expect(context.attachments.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WORKFLOW_YAML_ATTACHMENT_TYPE,
        data: expect.objectContaining({ name: 'foo' }),
      })
    );

    expect((out as { results: unknown[] }).results).toEqual([
      {
        type: ToolResultType.other,
        data: {
          attachment_id: 'new-att',
          attachment_version: 1,
          comment: 'created the workflow',
          success: true,
          created: true,
        },
      },
    ]);
  });

  it('updates an existing attachment and preserves workflowId across edits', async () => {
    generateWorkflowMock.mockResolvedValueOnce({
      workflow: generatedWorkflow,
      response: 'edited',
    } as any);

    const sourceAttachment = {
      id: 'src-att',
      version: 1,
      type: WORKFLOW_YAML_ATTACHMENT_TYPE,
      data: {
        data: {
          yaml: 'name: foo\n',
          workflowId: 'persisted-wf-123',
          name: 'foo',
        },
      },
    };
    const get = jest.fn().mockReturnValue(sourceAttachment);
    const update = jest.fn().mockResolvedValue({ id: 'src-att', current_version: 2 });
    const context = buildContext({ get, update });

    const tool = generateWorkflowTool({ workflowsManagement });
    await tool.handler({ query: 'tweak it', attachmentId: 'src-att' } as any, context);

    expect(generateWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: { yaml: 'name: foo\n' },
      })
    );

    expect(update).toHaveBeenCalledWith(
      'src-att',
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'foo',
          workflowId: 'persisted-wf-123',
        }),
      })
    );
  });

  it('returns an errorResult when attachmentId is provided but the attachment does not exist', async () => {
    const get = jest.fn().mockReturnValue(undefined);
    const context = buildContext({ get });
    const tool = generateWorkflowTool({ workflowsManagement });

    const out = await tool.handler({ query: 'q', attachmentId: 'missing' } as any, context);

    expect(generateWorkflowMock).not.toHaveBeenCalled();
    expect(context.attachments.add).not.toHaveBeenCalled();
    expect((out as { results: Array<{ type: string; data: any }> }).results[0].type).toBe(
      ToolResultType.error
    );
    expect(
      (out as { results: Array<{ type: string; data: any }> }).results[0].data.message
    ).toMatch(/not found/i);
  });

  it('returns an errorResult when the source attachment is the wrong type', async () => {
    const get = jest.fn().mockReturnValue({ id: 'x', type: 'something_else', data: { data: {} } });
    const context = buildContext({ get });
    const tool = generateWorkflowTool({ workflowsManagement });

    const out = await tool.handler({ query: 'q', attachmentId: 'x' } as any, context);

    expect(generateWorkflowMock).not.toHaveBeenCalled();
    expect((out as { results: Array<{ type: string }> }).results[0].type).toBe(
      ToolResultType.error
    );
  });

  it('returns an errorResult when generateWorkflow throws', async () => {
    generateWorkflowMock.mockRejectedValueOnce(new Error('boom'));

    const context = buildContext();
    const tool = generateWorkflowTool({ workflowsManagement });
    const out = await tool.handler({ query: 'q' } as any, context);

    expect((out as { results: unknown[] }).results).toEqual([
      { type: ToolResultType.error, data: { message: 'boom' } },
    ]);
  });
});
