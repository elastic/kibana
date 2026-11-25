/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AiIndexService } from '../ai_indices/service';
import {
  collectWorkflowValidationErrors,
  saveWorkflowToAiIndex,
  type SaveWorkflowApi,
  type WorkflowSaveAccess,
} from './save_workflow';

describe('saveWorkflowToAiIndex', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();
  let workflows: jest.Mocked<SaveWorkflowApi>;
  let aiIndexService: { assertCanAcceptAutomation: jest.Mock; addAutomation: jest.Mock };
  let access: jest.Mocked<WorkflowSaveAccess>;

  const save = (existingWorkflowId?: string) =>
    saveWorkflowToAiIndex({
      aiIndexId: 'shop',
      workflowYaml: 'name: A',
      existingWorkflowId,
      request,
      spaceId: 'default',
      logger,
      getAiIndexService: async () => aiIndexService as unknown as AiIndexService,
      workflowsManagement: workflows,
      access,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    workflows = {
      getWorkflow: jest.fn().mockResolvedValue({ id: 'wf-1' }),
      createWorkflow: jest.fn().mockResolvedValue({ id: 'wf-new', valid: true }),
      updateWorkflow: jest.fn().mockResolvedValue({ valid: true }),
      deleteWorkflows: jest.fn().mockResolvedValue({ failures: [] }),
      validateWorkflow: jest.fn().mockResolvedValue({ diagnostics: [] }),
    } as unknown as jest.Mocked<SaveWorkflowApi>;
    aiIndexService = {
      assertCanAcceptAutomation: jest.fn(),
      addAutomation: jest.fn().mockResolvedValue('attached'),
    };
    access = {
      assertCanCreate: jest.fn().mockResolvedValue(undefined),
      assertCanUpdate: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('creates the workflow and attaches it to the AI index', async () => {
    await expect(save()).resolves.toEqual({
      aiIndexId: 'shop',
      workflowId: 'wf-new',
      status: 'saved_and_attached',
    });

    expect(access.assertCanCreate).toHaveBeenCalled();
    expect(workflows.createWorkflow).toHaveBeenCalledWith({ yaml: 'name: A' }, 'default', request);
    expect(aiIndexService.assertCanAcceptAutomation).toHaveBeenCalledWith(
      'shop',
      'default',
      undefined
    );
    expect(aiIndexService.addAutomation).toHaveBeenCalledWith('shop', 'default', {
      type: 'workflow',
      value: 'wf-new',
    });
  });

  it('overwrites the workflow it was told to, after checking the caller may update it', async () => {
    aiIndexService.addAutomation.mockResolvedValue('already_attached');

    await expect(save('wf-1')).resolves.toEqual({
      aiIndexId: 'shop',
      workflowId: 'wf-1',
      status: 'saved_and_attached',
    });

    expect(access.assertCanUpdate).toHaveBeenCalledWith('wf-1');
    expect(access.assertCanCreate).not.toHaveBeenCalled();
    expect(workflows.updateWorkflow).toHaveBeenCalledWith(
      'wf-1',
      { yaml: 'name: A' },
      'default',
      request
    );
    expect(aiIndexService.assertCanAcceptAutomation).toHaveBeenCalledWith('shop', 'default', {
      type: 'workflow',
      value: 'wf-1',
    });
  });

  it('writes nothing when the caller lacks the privilege', async () => {
    access.assertCanCreate.mockRejectedValue(new Error('no create'));
    await expect(save()).rejects.toThrow('no create');
    expect(workflows.createWorkflow).not.toHaveBeenCalled();

    access.assertCanUpdate.mockRejectedValue(new Error('no update'));
    await expect(save('wf-1')).rejects.toThrow('no update');
    expect(workflows.updateWorkflow).not.toHaveBeenCalled();
  });

  it('writes nothing when the AI index cannot take the automation', async () => {
    aiIndexService.assertCanAcceptAutomation.mockRejectedValue(new Error('index is full'));

    await expect(save()).rejects.toThrow('index is full');

    expect(access.assertCanCreate).not.toHaveBeenCalled();
    expect(workflows.createWorkflow).not.toHaveBeenCalled();
  });

  it('refuses to overwrite a workflow that does not exist', async () => {
    workflows.getWorkflow.mockResolvedValue(null);

    await expect(save('wf-gone')).rejects.toThrow(/nothing to overwrite/);

    expect(workflows.updateWorkflow).not.toHaveBeenCalled();
  });

  it('deletes a workflow it created when attaching it fails, but not one it overwrote', async () => {
    aiIndexService.addAutomation.mockRejectedValue(new Error('modified concurrently'));

    await expect(save()).rejects.toThrow('modified concurrently');
    expect(workflows.deleteWorkflows).toHaveBeenCalledWith(['wf-new'], 'default', request);

    workflows.deleteWorkflows.mockClear();
    await expect(save('wf-1')).rejects.toThrow('modified concurrently');
    expect(workflows.deleteWorkflows).not.toHaveBeenCalled();
  });

  it('still reports the attach failure when rolling back fails', async () => {
    aiIndexService.addAutomation.mockRejectedValue(new Error('modified concurrently'));
    workflows.deleteWorkflows.mockRejectedValue(new Error('workflows unavailable'));

    await expect(save()).rejects.toThrow('modified concurrently');
    expect(logger.warn).toHaveBeenCalledWith(
      "Failed to roll back workflow 'wf-new' after attach failure",
      expect.anything()
    );
  });

  it('keeps and attaches a created workflow that is not valid, reporting why', async () => {
    workflows.createWorkflow.mockResolvedValue({ id: 'wf-new', valid: false });
    workflows.validateWorkflow.mockResolvedValue({
      diagnostics: [
        { severity: 'error', message: 'unknown step type' },
        { severity: 'warning', message: 'unused const' },
      ],
    });

    await expect(save()).resolves.toEqual({
      aiIndexId: 'shop',
      workflowId: 'wf-new',
      status: 'saved_and_attached',
      valid: false,
      validationErrors: ['unknown step type'],
    });
    expect(workflows.deleteWorkflows).not.toHaveBeenCalled();
  });

  it('reports the validation errors of an overwrite that left the workflow not valid', async () => {
    workflows.updateWorkflow.mockResolvedValue({ valid: false, validationErrors: ['bad step'] });

    await expect(save('wf-1')).resolves.toEqual(
      expect.objectContaining({ valid: false, validationErrors: ['bad step'] })
    );
  });
});

describe('collectWorkflowValidationErrors', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();

  it('returns the messages of the error diagnostics only', async () => {
    const workflowsManagement = {
      validateWorkflow: jest.fn().mockResolvedValue({
        diagnostics: [
          { severity: 'error', message: 'a' },
          { severity: 'warning', message: 'b' },
        ],
      }),
    };

    await expect(
      collectWorkflowValidationErrors({
        yaml: 'name: A',
        workflowsManagement,
        spaceId: 'default',
        request,
        logger,
      })
    ).resolves.toEqual(['a']);
  });

  it('returns none, and logs, when validating fails', async () => {
    const workflowsManagement = {
      validateWorkflow: jest.fn().mockRejectedValue(new Error('unavailable')),
    };

    await expect(
      collectWorkflowValidationErrors({
        yaml: 'name: A',
        workflowsManagement,
        spaceId: 'default',
        request,
        logger,
      })
    ).resolves.toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unavailable'));
  });
});
