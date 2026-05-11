/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { installSystemWorkflows } from './install_system_workflows';
import { SML_SYSTEM_WORKFLOW_TEMPLATES } from './templates';
import type { WorkflowsManagementApiContract } from '../types';

const createMockApi = (overrides: Partial<WorkflowsManagementApiContract> = {}) =>
  ({
    isWorkflowsAvailable: true,
    getWorkflow: jest.fn().mockResolvedValue(null),
    createWorkflow: jest.fn().mockResolvedValue({ id: 'x' }),
    updateWorkflow: jest.fn().mockResolvedValue({ id: 'x' }),
    deleteWorkflows: jest.fn().mockResolvedValue({ total: 1, deleted: 1, failures: [] }),
    getWorkflows: jest.fn(),
    runWorkflow: jest.fn(),
    cancelWorkflowExecution: jest.fn(),
    resumeWorkflowExecution: jest.fn(),
    getWorkflowExecutions: jest.fn(),
    getWorkflowExecution: jest.fn().mockResolvedValue(null),
    getChildWorkflowExecutions: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as jest.Mocked<WorkflowsManagementApiContract>);

describe('installSystemWorkflows', () => {
  it('skips when workflows feature is not available', async () => {
    const api = createMockApi({ isWorkflowsAvailable: false });
    const result = await installSystemWorkflows({
      workflowsManagementApi: api,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      logger: loggingSystemMock.createLogger(),
    });
    expect(result).toEqual({
      created: [],
      reinstalled: [],
      skipped: [],
      updated: [],
      failed: [],
    });
    expect(api.createWorkflow).not.toHaveBeenCalled();
  });

  it('creates every bundled template that does not already exist', async () => {
    const api = createMockApi();
    const result = await installSystemWorkflows({
      workflowsManagementApi: api,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      logger: loggingSystemMock.createLogger(),
    });

    expect(api.createWorkflow).toHaveBeenCalledTimes(SML_SYSTEM_WORKFLOW_TEMPLATES.length);
    expect(result.created).toEqual(SML_SYSTEM_WORKFLOW_TEMPLATES.map((t) => t.id));
    expect(result.skipped).toEqual([]);
    expect(result.reinstalled).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(api.deleteWorkflows).not.toHaveBeenCalled();
  });

  it('skips a live, SML-owned workflow whose YAML matches the template', async () => {
    const [firstTemplate] = SML_SYSTEM_WORKFLOW_TEMPLATES;
    const api = createMockApi({
      getWorkflow: jest
        .fn()
        .mockImplementation(async (id: string, _spaceId: string, options?: any) => {
          if (id !== firstTemplate.id) return null;
          // Live workflow — YAML matches the bundled template byte-for-byte.
          return { id, yaml: firstTemplate.yaml };
        }),
    });

    const result = await installSystemWorkflows({
      workflowsManagementApi: api,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      logger: loggingSystemMock.createLogger(),
    });

    expect(result.skipped).toContain(firstTemplate.id);
    expect(result.created).not.toContain(firstTemplate.id);
    expect(result.updated).not.toContain(firstTemplate.id);
    expect(api.createWorkflow).toHaveBeenCalledTimes(SML_SYSTEM_WORKFLOW_TEMPLATES.length - 1);
    expect(api.updateWorkflow).not.toHaveBeenCalled();
    expect(api.deleteWorkflows).not.toHaveBeenCalled();
  });

  it('refreshes a live SML-owned workflow whose YAML differs from the template', async () => {
    const [firstTemplate] = SML_SYSTEM_WORKFLOW_TEMPLATES;
    // Stored YAML: clearly stale but still carries the `sml-system` tag, so
    // ownership is recognisable even though the bundled YAML has changed.
    const staleYaml = [
      "version: '1'",
      'name: stale',
      'tags:',
      '  - sml-system',
      '  - sml',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - name: noop',
      '    type: console',
      '    with:',
      '      message: hi',
      '',
    ].join('\n');
    const api = createMockApi({
      getWorkflow: jest.fn().mockImplementation(async (id: string) => {
        if (id !== firstTemplate.id) return null;
        return { id, yaml: staleYaml, definition: null };
      }),
    });

    const request = httpServerMock.createKibanaRequest();
    const result = await installSystemWorkflows({
      workflowsManagementApi: api,
      request,
      spaceId: 'default',
      logger: loggingSystemMock.createLogger(),
    });

    expect(result.updated).toEqual([firstTemplate.id]);
    expect(result.skipped).not.toContain(firstTemplate.id);
    expect(api.updateWorkflow).toHaveBeenCalledWith(
      firstTemplate.id,
      { yaml: firstTemplate.yaml },
      'default',
      request
    );
    expect(api.createWorkflow).toHaveBeenCalledTimes(SML_SYSTEM_WORKFLOW_TEMPLATES.length - 1);
  });

  it('leaves a live workflow untouched when it is no longer SML-owned (no sml-system tag)', async () => {
    const [firstTemplate] = SML_SYSTEM_WORKFLOW_TEMPLATES;
    const userYaml = [
      "version: '1'",
      'name: my custom workflow',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - name: noop',
      '    type: console',
      '    with:',
      '      message: hi',
      '',
    ].join('\n');
    const api = createMockApi({
      getWorkflow: jest.fn().mockImplementation(async (id: string) => {
        if (id !== firstTemplate.id) return null;
        return { id, yaml: userYaml, definition: { name: 'my custom workflow' } };
      }),
    });

    const result = await installSystemWorkflows({
      workflowsManagementApi: api,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      logger: loggingSystemMock.createLogger(),
    });

    expect(result.skipped).toContain(firstTemplate.id);
    expect(result.updated).not.toContain(firstTemplate.id);
    expect(api.updateWorkflow).not.toHaveBeenCalled();
  });

  it('hard-deletes the tombstone and reinstalls when only a soft-deleted record exists', async () => {
    const [firstTemplate] = SML_SYSTEM_WORKFLOW_TEMPLATES;
    const api = createMockApi({
      getWorkflow: jest
        .fn()
        .mockImplementation(async (id: string, _spaceId: string, options?: any) => {
          if (id !== firstTemplate.id) return null;
          // Live lookup returns null; includeDeleted lookup finds the tombstone.
          return options?.includeDeleted ? { id, deleted_at: '2026-05-11T00:00:00.000Z' } : null;
        }),
    });

    const request = httpServerMock.createKibanaRequest();
    const result = await installSystemWorkflows({
      workflowsManagementApi: api,
      request,
      spaceId: 'default',
      logger: loggingSystemMock.createLogger(),
    });

    expect(api.deleteWorkflows).toHaveBeenCalledWith([firstTemplate.id], 'default', request, {
      force: true,
    });
    expect(result.reinstalled).toEqual([firstTemplate.id]);
    expect(result.created).toEqual(SML_SYSTEM_WORKFLOW_TEMPLATES.slice(1).map((t) => t.id));
    expect(result.skipped).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(api.createWorkflow).toHaveBeenCalledTimes(SML_SYSTEM_WORKFLOW_TEMPLATES.length);
  });

  it('records a failure when the tombstone cannot be purged', async () => {
    const [firstTemplate] = SML_SYSTEM_WORKFLOW_TEMPLATES;
    const api = createMockApi({
      getWorkflow: jest
        .fn()
        .mockImplementation(async (id: string, _spaceId: string, options?: any) => {
          if (id !== firstTemplate.id) return null;
          return options?.includeDeleted ? { id, deleted_at: '2026-05-11T00:00:00.000Z' } : null;
        }),
      deleteWorkflows: jest.fn().mockResolvedValue({
        total: 1,
        deleted: 0,
        failures: [{ id: firstTemplate.id, error: 'es down' }],
      }),
    });

    const result = await installSystemWorkflows({
      workflowsManagementApi: api,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      logger: loggingSystemMock.createLogger(),
    });

    expect(result.failed).toEqual([
      {
        id: firstTemplate.id,
        reason: expect.stringContaining('failed to purge soft-deleted tombstone'),
      },
    ]);
    expect(result.reinstalled).toEqual([]);
    // The first template's createWorkflow must NOT have been called because
    // purge failed; the remaining templates still proceed.
    const createIds = (api.createWorkflow as jest.Mock).mock.calls.map((c) => c[0].id);
    expect(createIds).not.toContain(firstTemplate.id);
    expect(createIds).toEqual(SML_SYSTEM_WORKFLOW_TEMPLATES.slice(1).map((t) => t.id));
  });

  it('recovers from a cross-space tombstone conflict by force-deleting and retrying', async () => {
    const [firstTemplate] = SML_SYSTEM_WORKFLOW_TEMPLATES;
    // Live + tombstone lookups in *this* space both return null (the
    // tombstone lives in a different space), so the installer can't detect it
    // up front. createWorkflow then throws because the global _id check
    // catches the cross-space tombstone. The defensive retry forcibly deletes
    // and tries again.
    let createCalls = 0;
    const conflictError = Object.assign(new Error("Workflow with id 'X' already exists"), {
      name: 'WorkflowConflictError',
    });
    const api = createMockApi({
      getWorkflow: jest.fn().mockResolvedValue(null),
      createWorkflow: jest.fn().mockImplementation(async (cmd: { id?: string }) => {
        if (cmd.id !== firstTemplate.id) return { id: cmd.id };
        createCalls += 1;
        if (createCalls === 1) {
          throw conflictError;
        }
        return { id: cmd.id };
      }),
      deleteWorkflows: jest.fn().mockResolvedValue({ total: 1, deleted: 1, failures: [] }),
    });

    const result = await installSystemWorkflows({
      workflowsManagementApi: api,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      logger: loggingSystemMock.createLogger(),
    });

    expect(api.deleteWorkflows).toHaveBeenCalledWith(
      [firstTemplate.id],
      'default',
      expect.anything(),
      { force: true }
    );
    expect(result.reinstalled).toEqual([firstTemplate.id]);
    expect(result.failed).toEqual([]);
  });

  it('surfaces a clear error when conflict is genuinely cross-space (force-delete found nothing)', async () => {
    const [firstTemplate] = SML_SYSTEM_WORKFLOW_TEMPLATES;
    const conflictError = Object.assign(new Error("Workflow with id 'X' already exists"), {
      name: 'WorkflowConflictError',
    });
    const api = createMockApi({
      getWorkflow: jest.fn().mockResolvedValue(null),
      createWorkflow: jest.fn().mockImplementation(async (cmd: { id?: string }) => {
        if (cmd.id === firstTemplate.id) throw conflictError;
        return { id: cmd.id };
      }),
      deleteWorkflows: jest.fn().mockResolvedValue({ total: 1, deleted: 0, failures: [] }),
    });

    const result = await installSystemWorkflows({
      workflowsManagementApi: api,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      logger: loggingSystemMock.createLogger(),
    });

    expect(result.failed).toEqual([
      {
        id: firstTemplate.id,
        reason: expect.stringContaining('already in use'),
      },
    ]);
    expect(result.reinstalled).toEqual([]);
  });

  it('records create failures and continues with remaining templates', async () => {
    const [firstTemplate] = SML_SYSTEM_WORKFLOW_TEMPLATES;
    const api = createMockApi({
      createWorkflow: jest.fn().mockImplementation(async (cmd: { id?: string }) => {
        if (cmd.id === firstTemplate.id) {
          throw new Error('boom');
        }
        return { id: cmd.id };
      }),
    });

    const result = await installSystemWorkflows({
      workflowsManagementApi: api,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      logger: loggingSystemMock.createLogger(),
    });

    expect(result.failed).toEqual([{ id: firstTemplate.id, reason: 'boom' }]);
    expect(result.created).toHaveLength(SML_SYSTEM_WORKFLOW_TEMPLATES.length - 1);
  });

  it('uses the caller request and the supplied spaceId', async () => {
    const api = createMockApi();
    const request = httpServerMock.createKibanaRequest();
    await installSystemWorkflows({
      workflowsManagementApi: api,
      request,
      spaceId: 'custom-space',
      logger: loggingSystemMock.createLogger(),
    });
    for (const call of (api.createWorkflow as jest.Mock).mock.calls) {
      expect(call[1]).toBe('custom-space');
      expect(call[2]).toBe(request);
    }
  });
});
