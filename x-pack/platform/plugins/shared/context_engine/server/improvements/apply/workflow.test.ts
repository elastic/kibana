/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AiIndexService } from '../../ai_indices/service';
import type { WorkflowProvider } from '../../workflows/provider';
import { addWorkflow, editWorkflow, removeWorkflow } from './workflow';

const request = httpServerMock.createKibanaRequest();
const context = { spaceId: 'default', request };
const logger = loggingSystemMock.createLogger();

const createWorkflows = (overrides: Partial<jest.Mocked<WorkflowProvider>> = {}) => {
  const workflows: jest.Mocked<WorkflowProvider> = {
    validate: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
    get: jest.fn().mockResolvedValue({ id: 'wf-1', managed: false, enabled: true }),
    create: jest.fn().mockResolvedValue('wf-1'),
    update: jest.fn().mockResolvedValue(undefined),
    setEnabled: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return workflows;
};

const createAiIndexService = () =>
  ({
    assertCanAcceptAutomation: jest.fn().mockResolvedValue(undefined),
    addAutomation: jest.fn().mockResolvedValue('attached'),
    removeAutomation: jest.fn().mockResolvedValue('detached'),
  } as unknown as jest.Mocked<AiIndexService>);

const yaml = 'name: Nightly refresh\nsteps: []\n';

describe('addWorkflow', () => {
  it('creates the workflow and links it to the AI index', async () => {
    const workflows = createWorkflows();
    const aiIndexService = createAiIndexService();

    const id = await addWorkflow({
      workflows,
      aiIndexService,
      aiIndexId: 'support',
      yaml,
      context,
      logger,
    });

    expect(id).toBe('wf-1');
    expect(workflows.create).toHaveBeenCalledWith({ ...context, yaml });
    expect(aiIndexService.addAutomation).toHaveBeenCalledWith('support', {
      type: 'workflow',
      value: 'wf-1',
    });
  });

  it('rejects invalid YAML before creating anything', async () => {
    const workflows = createWorkflows({
      validate: jest.fn().mockResolvedValue({ valid: false, errors: ['steps must not be empty'] }),
    });
    const aiIndexService = createAiIndexService();

    await expect(
      addWorkflow({ workflows, aiIndexService, aiIndexId: 'support', yaml, context, logger })
    ).rejects.toThrow(/steps must not be empty/);
    expect(workflows.create).not.toHaveBeenCalled();
  });

  it('checks the AI index can accept the automation before creating the workflow', async () => {
    const workflows = createWorkflows();
    const aiIndexService = createAiIndexService();
    aiIndexService.assertCanAcceptAutomation.mockRejectedValue(new Error('automation limit'));

    await expect(
      addWorkflow({ workflows, aiIndexService, aiIndexId: 'support', yaml, context, logger })
    ).rejects.toThrow('automation limit');
    expect(workflows.create).not.toHaveBeenCalled();
  });

  it('deletes the workflow again when linking fails, so no orphan is left', async () => {
    const workflows = createWorkflows();
    const aiIndexService = createAiIndexService();
    aiIndexService.addAutomation.mockRejectedValue(new Error('conflict'));

    await expect(
      addWorkflow({ workflows, aiIndexService, aiIndexId: 'support', yaml, context, logger })
    ).rejects.toThrow('conflict');
    expect(workflows.delete).toHaveBeenCalledWith({ ...context, workflowId: 'wf-1' });
  });

  it('still reports the link failure when the rollback delete also fails', async () => {
    const workflows = createWorkflows({
      delete: jest.fn().mockRejectedValue(new Error('delete forbidden')),
    });
    const aiIndexService = createAiIndexService();
    aiIndexService.addAutomation.mockRejectedValue(new Error('conflict'));

    await expect(
      addWorkflow({ workflows, aiIndexService, aiIndexId: 'support', yaml, context, logger })
    ).rejects.toThrow('conflict');
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('editWorkflow', () => {
  it('replaces the definition of an existing workflow', async () => {
    const workflows = createWorkflows();

    const id = await editWorkflow({ workflows, workflowId: 'wf-1', yaml, context });

    expect(id).toBe('wf-1');
    expect(workflows.update).toHaveBeenCalledWith({ ...context, workflowId: 'wf-1', yaml });
  });

  it('reports a workflow that no longer exists', async () => {
    const workflows = createWorkflows({ get: jest.fn().mockResolvedValue(null) });

    await expect(editWorkflow({ workflows, workflowId: 'gone', yaml, context })).rejects.toThrow(
      /was not found in this space/
    );
    expect(workflows.update).not.toHaveBeenCalled();
  });

  it('refuses to edit a managed workflow', async () => {
    const workflows = createWorkflows({
      get: jest.fn().mockResolvedValue({ id: 'wf-1', managed: true, enabled: true }),
    });

    await expect(editWorkflow({ workflows, workflowId: 'wf-1', yaml, context })).rejects.toThrow(
      /managed by Kibana/
    );
    expect(workflows.update).not.toHaveBeenCalled();
  });
});

describe('removeWorkflow', () => {
  it('disables the workflow and detaches it, without deleting it', async () => {
    const workflows = createWorkflows();
    const aiIndexService = createAiIndexService();

    const id = await removeWorkflow({
      workflows,
      aiIndexService,
      aiIndexId: 'support',
      workflowId: 'wf-1',
      context,
    });

    expect(id).toBe('wf-1');
    expect(workflows.setEnabled).toHaveBeenCalledWith({
      ...context,
      workflowId: 'wf-1',
      enabled: false,
    });
    expect(workflows.delete).not.toHaveBeenCalled();
    expect(aiIndexService.removeAutomation).toHaveBeenCalledWith('support', {
      type: 'workflow',
      value: 'wf-1',
    });
  });

  it('skips disabling a workflow that is already disabled', async () => {
    const workflows = createWorkflows({
      get: jest.fn().mockResolvedValue({ id: 'wf-1', managed: false, enabled: false }),
    });
    const aiIndexService = createAiIndexService();

    await removeWorkflow({
      workflows,
      aiIndexService,
      aiIndexId: 'support',
      workflowId: 'wf-1',
      context,
    });

    expect(workflows.setEnabled).not.toHaveBeenCalled();
    expect(aiIndexService.removeAutomation).toHaveBeenCalled();
  });

  it('reports a workflow that no longer exists', async () => {
    const workflows = createWorkflows({ get: jest.fn().mockResolvedValue(null) });
    const aiIndexService = createAiIndexService();

    await expect(
      removeWorkflow({
        workflows,
        aiIndexService,
        aiIndexId: 'support',
        workflowId: 'gone',
        context,
      })
    ).rejects.toThrow(/was not found in this space/);
    expect(aiIndexService.removeAutomation).not.toHaveBeenCalled();
  });
});
