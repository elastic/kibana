/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateWorkflow } from '@kbn/agent-builder-workflow-gen';
import { ToolResultType } from '@kbn/agent-builder-common';
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  WORKFLOW_YAML_CHANGED_EVENT,
  WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
} from '@kbn/workflows/common/constants';
import { generateWorkflowTool } from './generate_workflow';

jest.mock('@kbn/agent-builder-workflow-gen', () => ({
  generateWorkflow: jest.fn(),
}));

const generateWorkflowMock = generateWorkflow as jest.MockedFunction<typeof generateWorkflow>;

describe('generateWorkflowTool', () => {
  const workflowsManagement = {
    management: { __mock: 'workflowsApi' },
  } as any;

  const aiTelemetryClient = {
    reportEditResult: jest.fn(),
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
      sendUiEvent: jest.Mock;
      stack: unknown[];
    }> = {}
  ) =>
    ({
      modelProvider: { getDefaultModel: jest.fn().mockResolvedValue({ id: 'model' }) },
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      request: { __mock: 'request' },
      spaceId: 'default',
      attachments: {
        get: overrides.get ?? jest.fn(),
        add:
          overrides.add ??
          jest
            .fn()
            // first call = diff attachment, second call = workflow attachment (creation path)
            .mockResolvedValueOnce({ id: 'diff-att', current_version: 1 })
            .mockResolvedValueOnce({ id: 'new-att', current_version: 1 }),
        update:
          overrides.update ?? jest.fn().mockResolvedValue({ id: 'src-att', current_version: 2 }),
      },
      events: {
        sendUiEvent: overrides.sendUiEvent ?? jest.fn(),
      },
      runContext: {
        stack: overrides.stack ?? [],
      },
    } as any);

  beforeEach(() => {
    generateWorkflowMock.mockReset();
    aiTelemetryClient.reportEditResult.mockReset();
  });

  it('creates a new workflow: adds diff attachment, adds workflow attachment, sends UI event, reports telemetry', async () => {
    generateWorkflowMock.mockResolvedValueOnce({
      workflow: generatedWorkflow,
      response: 'created the workflow',
    } as any);

    const context = buildContext();
    const tool = generateWorkflowTool({ workflowsManagement, aiTelemetryClient });
    const out = await tool.handler(
      { query: 'a workflow', context: 'ctx', instructions: 'inst' } as any,
      context
    );

    expect(context.attachments.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE })
    );
    expect(context.attachments.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WORKFLOW_YAML_ATTACHMENT_TYPE,
        data: expect.objectContaining({ name: 'foo' }),
      })
    );

    expect(context.events.sendUiEvent).toHaveBeenCalledWith(
      WORKFLOW_YAML_CHANGED_EVENT,
      expect.objectContaining({
        beforeYaml: '',
        proposalId: expect.any(String),
        // Client keys agent edits to the workflow the conversation was started
        // against using this stable attachment id — must always be present.
        attachmentId: 'new-att',
      })
    );

    expect(aiTelemetryClient.reportEditResult).toHaveBeenCalledWith(
      expect.objectContaining({ editSuccess: true, isCreation: true })
    );

    const result = (out as unknown as { results: Array<{ data: Record<string, unknown> }> })
      .results[0];
    expect(result.data.diff_attachment_id).toBe('diff-att');
    expect(result.data.attachment_id).toBe('new-att');
    expect(result.data.proposal_id).toEqual(expect.any(String));
    expect(result.data.created).toBe(true);
    expect(result.data.comment).toBe('created the workflow');
  });

  it('persists a provided workflowId on creation: both diff and workflow attachments carry it', async () => {
    generateWorkflowMock.mockResolvedValueOnce({
      workflow: generatedWorkflow,
      response: 'created',
    } as any);

    const context = buildContext();
    const tool = generateWorkflowTool({ workflowsManagement, aiTelemetryClient });
    await tool.handler({ query: 'a workflow', workflowId: 'my-custom-id' } as any, context);

    expect(context.attachments.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
        data: expect.objectContaining({ workflowId: 'my-custom-id' }),
      })
    );
    expect(context.attachments.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WORKFLOW_YAML_ATTACHMENT_TYPE,
        data: expect.objectContaining({ workflowId: 'my-custom-id', name: 'foo' }),
      })
    );
  });

  it('rejects invalid workflowId values via the zod schema', () => {
    const tool = generateWorkflowTool({ workflowsManagement, aiTelemetryClient });

    expect(tool.schema.safeParse({ query: 'q', workflowId: 'UPPER-CASE' }).success).toBe(false);
    expect(tool.schema.safeParse({ query: 'q', workflowId: 'has spaces' }).success).toBe(false);
    expect(tool.schema.safeParse({ query: 'q', workflowId: '-leading-hyphen' }).success).toBe(
      false
    );
    expect(tool.schema.safeParse({ query: 'q', workflowId: 'trailing-' }).success).toBe(false);
    expect(tool.schema.safeParse({ query: 'q', workflowId: 'ab' }).success).toBe(false);

    expect(tool.schema.safeParse({ query: 'q', workflowId: 'my-workflow-123' }).success).toBe(true);
    expect(tool.schema.safeParse({ query: 'q' }).success).toBe(true);
  });

  it('updates an existing attachment: updates (not adds) workflow attachment, emits diff, reports telemetry', async () => {
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
    const addMock = jest.fn().mockResolvedValue({ id: 'diff-att', current_version: 1 });
    const sendUiEvent = jest.fn();
    const context = buildContext({ get, update, add: addMock, sendUiEvent });

    const tool = generateWorkflowTool({ workflowsManagement, aiTelemetryClient });
    const out = await tool.handler({ query: 'tweak it', attachmentId: 'src-att' } as any, context);

    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE })
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
    expect(addMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: WORKFLOW_YAML_ATTACHMENT_TYPE })
    );

    expect(sendUiEvent).toHaveBeenCalledWith(
      WORKFLOW_YAML_CHANGED_EVENT,
      expect.objectContaining({ beforeYaml: 'name: foo\n' })
    );

    expect(aiTelemetryClient.reportEditResult).toHaveBeenCalledWith(
      expect.objectContaining({ editSuccess: true, isCreation: false })
    );

    const result = (out as unknown as { results: Array<{ data: Record<string, unknown> }> })
      .results[0];
    expect(result.data.updated).toBe(true);
  });

  it('returns an errorResult when attachmentId is provided but the attachment does not exist', async () => {
    const get = jest.fn().mockReturnValue(undefined);
    const context = buildContext({ get });
    const tool = generateWorkflowTool({ workflowsManagement, aiTelemetryClient });

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
    const tool = generateWorkflowTool({ workflowsManagement, aiTelemetryClient });

    const out = await tool.handler({ query: 'q', attachmentId: 'x' } as any, context);

    expect(generateWorkflowMock).not.toHaveBeenCalled();
    expect((out as { results: Array<{ type: string }> }).results[0].type).toBe(
      ToolResultType.error
    );
  });

  it('returns an errorResult and reports failed telemetry when generateWorkflow throws', async () => {
    generateWorkflowMock.mockRejectedValueOnce(new Error('boom'));

    const context = buildContext();
    const tool = generateWorkflowTool({ workflowsManagement, aiTelemetryClient });
    const out = await tool.handler({ query: 'q' } as any, context);

    expect((out as { results: unknown[] }).results).toEqual([
      { type: ToolResultType.error, data: { message: 'boom' } },
    ]);

    expect(aiTelemetryClient.reportEditResult).toHaveBeenCalledWith(
      expect.objectContaining({ editSuccess: false, isCreation: true })
    );
  });
});
