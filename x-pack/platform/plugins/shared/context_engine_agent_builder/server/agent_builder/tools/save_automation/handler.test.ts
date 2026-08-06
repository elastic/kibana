/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { AI_INDEX_ATTACHMENT_TYPE } from '@kbn/context-engine-plugin/common/agent_builder_attachments';
import { MAX_AI_INDEX_AUTOMATIONS } from '@kbn/context-engine-plugin/common/constants';
import {
  AiIndexConflictError,
  AiIndexManagedError,
} from '@kbn/context-engine-plugin/server/ai_indices/errors';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import {
  resolveAiIndexIdFromAttachments,
  saveAutomationHandler,
  getSaveAutomationErrorMessage,
} from './handler';

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn().mockResolvedValue(undefined),
}));

const WORKFLOW_ATTACHMENT_ID = 'workflow-attachment-1';
const WORKFLOW_YAML = 'name: pilot\nsteps: []';

const createAttachmentStateManager = ({
  origin,
}: {
  origin?: string;
} = {}) => ({
  getAll: jest.fn().mockReturnValue([
    {
      id: WORKFLOW_ATTACHMENT_ID,
      type: 'workflow.yaml',
      origin,
      current_version: 1,
      versions: [{ version: 1, data: { yaml: WORKFLOW_YAML, workflowId: 'pilot-workflow' } }],
    },
    {
      id: 'ai-index-attachment',
      type: AI_INDEX_ATTACHMENT_TYPE,
      current_version: 1,
      versions: [{ version: 1, data: { id: 'my-ai-index' } }],
    },
  ]),
  updateOrigin: jest.fn().mockResolvedValue(true),
});

const baseAiIndex = {
  id: 'my-ai-index',
  description: 'Support tickets',
  managed: false,
  dest: { type: 'data_stream' as const, value: 'ai-index-ds-my-ai-index' },
  sources: [{ type: 'esql' as const, value: 'FROM tickets' }],
  automations: [{ type: 'workflow' as const, value: 'wf-existing' }],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

describe('resolveAiIndexIdFromAttachments', () => {
  it('returns an explicit aiIndexId when provided', () => {
    expect(
      resolveAiIndexIdFromAttachments(
        [{ type: AI_INDEX_ATTACHMENT_TYPE, data: { id: 'from-attachment' } }],
        'explicit-id'
      )
    ).toBe('explicit-id');
  });

  it('resolves aiIndexId from the ai_index attachment', () => {
    expect(
      resolveAiIndexIdFromAttachments([
        { type: AI_INDEX_ATTACHMENT_TYPE, data: { id: 'from-attachment' } },
      ])
    ).toBe('from-attachment');
  });

  it('throws when no aiIndexId is available', () => {
    expect(() => resolveAiIndexIdFromAttachments([])).toThrow(/No ai_index attachment found/);
  });
});

describe('getSaveAutomationErrorMessage', () => {
  it('returns domain error messages', () => {
    expect(getSaveAutomationErrorMessage(new AiIndexManagedError('my-ai-index'))).toBe(
      "AI index 'my-ai-index' is managed and cannot be modified via the API"
    );
    expect(getSaveAutomationErrorMessage(new AiIndexConflictError('my-ai-index'))).toContain(
      'my-ai-index'
    );
  });

  it('returns a generic message for internal errors', () => {
    expect(
      getSaveAutomationErrorMessage(
        Object.assign(new Error('search failed'), { statusCode: 500, meta: {} })
      )
    ).toBe('An unexpected error occurred while saving the workflow automation.');
    expect(getSaveAutomationErrorMessage('boom')).toBe(
      'An unexpected error occurred while saving the workflow automation.'
    );
  });

  it('returns expected business error messages', () => {
    expect(
      getSaveAutomationErrorMessage(new Error("Workflow 'wf-1' was not found in this space."))
    ).toBe("Workflow 'wf-1' was not found in this space.");
  });
});

describe('saveAutomationHandler', () => {
  const request = httpServerMock.createKibanaRequest();
  const getCoreStart = jest.fn();
  const getSecurityStart = jest.fn().mockResolvedValue(undefined);
  let aiIndexService: jest.Mocked<Pick<AiIndexService, 'get' | 'put'>>;
  let workflowsManagement: {
    getWorkflow: jest.Mock;
    createWorkflow: jest.Mock;
    updateWorkflow: jest.Mock;
  };

  beforeEach(() => {
    aiIndexService = {
      get: jest.fn(),
      put: jest.fn(),
    };
    workflowsManagement = {
      getWorkflow: jest.fn().mockResolvedValue({ id: 'wf-new' }),
      createWorkflow: jest.fn(),
      updateWorkflow: jest.fn(),
    };
    getCoreStart.mockResolvedValue({});
  });

  it('creates the workflow and attaches it to the AI index', async () => {
    aiIndexService.get.mockResolvedValue(baseAiIndex);
    aiIndexService.put.mockResolvedValue('updated');
    workflowsManagement.createWorkflow.mockResolvedValue({ id: 'wf-new', name: 'pilot' });

    const attachments = createAttachmentStateManager();

    const result = await saveAutomationHandler({
      params: { workflowAttachmentId: WORKFLOW_ATTACHMENT_ID },
      request,
      spaceId: 'default',
      attachments: attachments as never,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      getCoreStart,
      getSecurityStart,
      getWorkflowsManagement: () => workflowsManagement as never,
    });

    expect(workflowsManagement.createWorkflow).toHaveBeenCalledWith(
      { yaml: WORKFLOW_YAML, id: 'pilot-workflow' },
      'default',
      request
    );
    expect(attachments.updateOrigin).toHaveBeenCalledWith(
      WORKFLOW_ATTACHMENT_ID,
      'wf-new',
      ATTACHMENT_REF_ACTOR.agent
    );
    expect(result).toEqual({
      aiIndexId: 'my-ai-index',
      workflowId: 'wf-new',
      status: 'saved_and_attached',
    });
  });

  it('updates an already persisted workflow before attaching', async () => {
    aiIndexService.get.mockResolvedValue(baseAiIndex);
    aiIndexService.put.mockResolvedValue('updated');

    const attachments = createAttachmentStateManager({ origin: 'wf-persisted' });

    const result = await saveAutomationHandler({
      params: { workflowAttachmentId: WORKFLOW_ATTACHMENT_ID },
      request,
      spaceId: 'default',
      attachments: attachments as never,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      getCoreStart,
      getSecurityStart,
      getWorkflowsManagement: () => workflowsManagement as never,
    });

    expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
      'wf-persisted',
      { yaml: WORKFLOW_YAML },
      'default',
      request
    );
    expect(workflowsManagement.createWorkflow).not.toHaveBeenCalled();
    expect(result.workflowId).toBe('wf-persisted');
  });

  it('attaches an already saved workflow by id', async () => {
    aiIndexService.get.mockResolvedValue(baseAiIndex);
    aiIndexService.put.mockResolvedValue('updated');

    const attachments = createAttachmentStateManager();

    const result = await saveAutomationHandler({
      params: { workflowId: 'wf-new' },
      request,
      spaceId: 'default',
      attachments: attachments as never,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      getCoreStart,
      getSecurityStart,
      getWorkflowsManagement: () => workflowsManagement as never,
    });

    expect(result).toEqual({
      aiIndexId: 'my-ai-index',
      workflowId: 'wf-new',
      status: 'attached',
    });
    expect(workflowsManagement.getWorkflow).toHaveBeenCalledWith('wf-new', 'default');
    expect(workflowsManagement.createWorkflow).not.toHaveBeenCalled();
  });

  it('rejects attaching a workflow id that does not exist', async () => {
    aiIndexService.get.mockResolvedValue(baseAiIndex);
    workflowsManagement.getWorkflow.mockResolvedValue(null);

    await expect(
      saveAutomationHandler({
        params: { workflowId: 'wf-missing' },
        request,
        spaceId: 'default',
        attachments: createAttachmentStateManager() as never,
        getAiIndexService: () => aiIndexService as unknown as AiIndexService,
        getCoreStart,
        getSecurityStart,
        getWorkflowsManagement: () => workflowsManagement as never,
      })
    ).rejects.toThrow(/Workflow 'wf-missing' was not found/);
  });

  it('rejects when updateOrigin fails after creating a workflow', async () => {
    aiIndexService.get.mockResolvedValue(baseAiIndex);
    aiIndexService.put.mockResolvedValue('updated');
    workflowsManagement.createWorkflow.mockResolvedValue({ id: 'wf-new', name: 'pilot' });

    const attachments = createAttachmentStateManager();
    attachments.updateOrigin.mockResolvedValue(false);

    await expect(
      saveAutomationHandler({
        params: { workflowAttachmentId: WORKFLOW_ATTACHMENT_ID },
        request,
        spaceId: 'default',
        attachments: attachments as never,
        getAiIndexService: () => aiIndexService as unknown as AiIndexService,
        getCoreStart,
        getSecurityStart,
        getWorkflowsManagement: () => workflowsManagement as never,
      })
    ).rejects.toThrow(/Failed to record workflow origin/);
  });

  it('returns already_attached when the workflow is already linked', async () => {
    aiIndexService.get.mockResolvedValue(baseAiIndex);
    workflowsManagement.createWorkflow.mockResolvedValue({ id: 'wf-existing', name: 'pilot' });

    const attachments = createAttachmentStateManager();

    const result = await saveAutomationHandler({
      params: { workflowAttachmentId: WORKFLOW_ATTACHMENT_ID },
      request,
      spaceId: 'default',
      attachments: attachments as never,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      getCoreStart,
      getSecurityStart,
      getWorkflowsManagement: () => workflowsManagement as never,
    });

    expect(result.status).toBe('already_attached');
    expect(aiIndexService.put).not.toHaveBeenCalled();
  });

  it('rejects managed AI indices', async () => {
    aiIndexService.get.mockResolvedValue({ ...baseAiIndex, managed: true });
    workflowsManagement.createWorkflow.mockResolvedValue({ id: 'wf-new', name: 'pilot' });

    await expect(
      saveAutomationHandler({
        params: { workflowAttachmentId: WORKFLOW_ATTACHMENT_ID },
        request,
        spaceId: 'default',
        attachments: createAttachmentStateManager() as never,
        getAiIndexService: () => aiIndexService as unknown as AiIndexService,
        getCoreStart,
        getSecurityStart,
        getWorkflowsManagement: () => workflowsManagement as never,
      })
    ).rejects.toBeInstanceOf(AiIndexManagedError);
  });

  it('rejects when the automation limit is reached', async () => {
    aiIndexService.get.mockResolvedValue({
      ...baseAiIndex,
      automations: Array.from({ length: MAX_AI_INDEX_AUTOMATIONS }, (_, index) => ({
        type: 'workflow' as const,
        value: `wf-${index}`,
      })),
    });
    workflowsManagement.createWorkflow.mockResolvedValue({ id: 'wf-new', name: 'pilot' });

    await expect(
      saveAutomationHandler({
        params: { workflowAttachmentId: WORKFLOW_ATTACHMENT_ID },
        request,
        spaceId: 'default',
        attachments: createAttachmentStateManager() as never,
        getAiIndexService: () => aiIndexService as unknown as AiIndexService,
        getCoreStart,
        getSecurityStart,
        getWorkflowsManagement: () => workflowsManagement as never,
      })
    ).rejects.toThrow(/maximum number of automations/);
  });
});
