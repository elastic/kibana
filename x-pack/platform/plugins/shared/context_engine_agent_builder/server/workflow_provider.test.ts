/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import { createWorkflowProvider } from './workflow_provider';

const request = httpServerMock.createKibanaRequest();
const context = { spaceId: 'default', request };

const createWorkflowsManagement = () =>
  ({
    validateWorkflow: jest.fn(),
    getWorkflow: jest.fn(),
    createWorkflow: jest.fn(),
    updateWorkflow: jest.fn(),
    deleteWorkflows: jest.fn(),
  } as unknown as jest.Mocked<WorkflowsManagementApi>);

describe('createWorkflowProvider', () => {
  describe('validate', () => {
    it('reports valid YAML', async () => {
      const workflowsManagement = createWorkflowsManagement();
      workflowsManagement.validateWorkflow.mockResolvedValue({ valid: true, diagnostics: [] });

      await expect(
        createWorkflowProvider(workflowsManagement).validate({ ...context, yaml: 'name: x' })
      ).resolves.toEqual({ valid: true, errors: [] });
      expect(workflowsManagement.validateWorkflow).toHaveBeenCalledWith(
        'name: x',
        'default',
        request
      );
    });

    it('keeps only error diagnostics, dropping warnings', async () => {
      const workflowsManagement = createWorkflowsManagement();
      workflowsManagement.validateWorkflow.mockResolvedValue({
        valid: false,
        diagnostics: [
          { severity: 'error', message: 'steps must not be empty', source: 'yaml-schema' },
          { severity: 'warning', message: 'name is very long', source: 'yaml-schema' },
        ],
      });

      await expect(
        createWorkflowProvider(workflowsManagement).validate({ ...context, yaml: 'name: x' })
      ).resolves.toEqual({ valid: false, errors: ['steps must not be empty'] });
    });
  });

  describe('get', () => {
    it('summarises an existing workflow', async () => {
      const workflowsManagement = createWorkflowsManagement();
      workflowsManagement.getWorkflow.mockResolvedValue({
        id: 'wf-1',
        enabled: true,
        managed: true,
      } as Awaited<ReturnType<WorkflowsManagementApi['getWorkflow']>>);

      await expect(
        createWorkflowProvider(workflowsManagement).get({ ...context, workflowId: 'wf-1' })
      ).resolves.toEqual({ id: 'wf-1', managed: true, enabled: true });
    });

    it('treats an absent `managed` flag as unmanaged', async () => {
      const workflowsManagement = createWorkflowsManagement();
      workflowsManagement.getWorkflow.mockResolvedValue({ id: 'wf-1', enabled: false } as Awaited<
        ReturnType<WorkflowsManagementApi['getWorkflow']>
      >);

      await expect(
        createWorkflowProvider(workflowsManagement).get({ ...context, workflowId: 'wf-1' })
      ).resolves.toEqual({ id: 'wf-1', managed: false, enabled: false });
    });

    it('resolves null for a missing workflow', async () => {
      const workflowsManagement = createWorkflowsManagement();
      workflowsManagement.getWorkflow.mockResolvedValue(null);

      await expect(
        createWorkflowProvider(workflowsManagement).get({ ...context, workflowId: 'gone' })
      ).resolves.toBeNull();
    });
  });

  it('creates a workflow and returns its id', async () => {
    const workflowsManagement = createWorkflowsManagement();
    workflowsManagement.createWorkflow.mockResolvedValue({ id: 'wf-1' } as Awaited<
      ReturnType<WorkflowsManagementApi['createWorkflow']>
    >);

    await expect(
      createWorkflowProvider(workflowsManagement).create({ ...context, yaml: 'name: x' })
    ).resolves.toBe('wf-1');
    expect(workflowsManagement.createWorkflow).toHaveBeenCalledWith(
      { yaml: 'name: x' },
      'default',
      request
    );
  });

  it('updates only the definition', async () => {
    const workflowsManagement = createWorkflowsManagement();

    await createWorkflowProvider(workflowsManagement).update({
      ...context,
      workflowId: 'wf-1',
      yaml: 'name: x',
    });

    expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
      'wf-1',
      { yaml: 'name: x' },
      'default',
      request
    );
  });

  it('updates only the enablement flag', async () => {
    const workflowsManagement = createWorkflowsManagement();

    await createWorkflowProvider(workflowsManagement).setEnabled({
      ...context,
      workflowId: 'wf-1',
      enabled: false,
    });

    expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
      'wf-1',
      { enabled: false },
      'default',
      request
    );
  });

  it('deletes a single workflow', async () => {
    const workflowsManagement = createWorkflowsManagement();

    await createWorkflowProvider(workflowsManagement).delete({ ...context, workflowId: 'wf-1' });

    expect(workflowsManagement.deleteWorkflows).toHaveBeenCalledWith(['wf-1'], 'default', request);
  });
});
