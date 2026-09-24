/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { runAutomationHandler } from './handler';

jest.mock('@kbn/agent-builder-tools-base/workflows', () => ({
  hasWorkflowExecutePrivilege: jest.fn().mockResolvedValue(true),
  hasWorkflowUpdatePrivilege: jest.fn().mockResolvedValue(true),
  executeWorkflow: jest.fn(),
}));

const { hasWorkflowExecutePrivilege, hasWorkflowUpdatePrivilege, executeWorkflow } =
  jest.requireMock('@kbn/agent-builder-tools-base/workflows');

describe('runAutomationHandler', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();
  const spaceId = 'default';
  const workflowId = 'wf-123';

  const getWorkflowMock = jest.fn();
  const updateWorkflowMock = jest.fn();

  const getCoreStart = jest.fn().mockResolvedValue({
    http: { basePath: { serverBasePath: '' } },
  });

  const buildDeps = () => ({
    params: { workflowId },
    request,
    spaceId,
    logger,
    getCoreStart,
    getSecurityStart: async () => undefined,
    getWorkflowsManagement: () =>
      ({
        getWorkflow: getWorkflowMock,
        updateWorkflow: updateWorkflowMock,
      } as never),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    hasWorkflowExecutePrivilege.mockResolvedValue(true);
    hasWorkflowUpdatePrivilege.mockResolvedValue(true);
  });

  it('returns started=true with executionId and statusCheckHint when run succeeds', async () => {
    getWorkflowMock.mockResolvedValue({ id: workflowId, enabled: true });
    executeWorkflow.mockResolvedValue({
      success: true,
      execution: { execution_id: 'exec-456' },
    });

    const result = await runAutomationHandler(buildDeps());

    expect(result.started).toBe(true);
    expect(result.executionId).toBe('exec-456');
    expect(result.statusCheckHint).toContain('exec-456');
    expect(result.statusCheckHint).toContain('platform.core.get_workflow_execution_status');
    expect(result.workflowUrl).toContain(encodeURIComponent(workflowId));
  });

  it('returns started=false when execute privilege is missing', async () => {
    hasWorkflowExecutePrivilege.mockResolvedValue(false);

    const result = await runAutomationHandler(buildDeps());

    expect(result.started).toBe(false);
    expect(result.reason).toContain('Unauthorized');
    expect(result.statusCheckHint).toBeUndefined();
    expect(result.workflowUrl).toBeUndefined();
  });

  it('returns started=false when executeWorkflow fails', async () => {
    getWorkflowMock.mockResolvedValue({ id: workflowId, enabled: true });
    executeWorkflow.mockResolvedValue({
      success: false,
      error: 'Workflow step failed',
    });

    const result = await runAutomationHandler(buildDeps());

    expect(result.started).toBe(false);
    expect(result.reason).toBe('Workflow step failed');
    expect(result.statusCheckHint).toBeUndefined();
    expect(result.workflowUrl).toBeUndefined();
  });

  it('includes workflowUrl in non-default space', async () => {
    getWorkflowMock.mockResolvedValue({ id: workflowId, enabled: true });
    executeWorkflow.mockResolvedValue({
      success: true,
      execution: { execution_id: 'exec-789' },
    });

    const result = await runAutomationHandler({
      ...buildDeps(),
      spaceId: 'team-a',
    });

    expect(result.workflowUrl).toContain('/s/team-a/');
    expect(result.workflowUrl).toContain(encodeURIComponent(workflowId));
  });

  it('workflowUrl includes the execution tab deep link when run started', async () => {
    getWorkflowMock.mockResolvedValue({ id: workflowId, enabled: true });
    executeWorkflow.mockResolvedValue({
      success: true,
      execution: { execution_id: 'exec-deep' },
    });

    const result = await runAutomationHandler(buildDeps());

    expect(result.workflowUrl).toContain('tab=executions');
    expect(result.workflowUrl).toContain(`executionId=${encodeURIComponent('exec-deep')}`);
  });

  it('enables a disabled workflow and returns enabledForRun=true', async () => {
    getWorkflowMock.mockResolvedValue({ id: workflowId, enabled: false });
    updateWorkflowMock.mockResolvedValue({ id: workflowId, enabled: true });
    executeWorkflow.mockResolvedValue({
      success: true,
      execution: { execution_id: 'exec-enable' },
    });

    const result = await runAutomationHandler(buildDeps());

    expect(updateWorkflowMock).toHaveBeenCalledWith(
      workflowId,
      { enabled: true },
      spaceId,
      request
    );
    expect(result.started).toBe(true);
    expect(result.enabledForRun).toBe(true);
  });

  it('returns started=false when update privilege is missing for a disabled workflow', async () => {
    getWorkflowMock.mockResolvedValue({ id: workflowId, enabled: false });
    hasWorkflowUpdatePrivilege.mockResolvedValue(false);

    const result = await runAutomationHandler(buildDeps());

    expect(updateWorkflowMock).not.toHaveBeenCalled();
    expect(executeWorkflow).not.toHaveBeenCalled();
    expect(result.started).toBe(false);
    expect(result.reason).toContain('update privilege');
  });

  it('returns started=false when updateWorkflow returns enabled=false (validation refused)', async () => {
    getWorkflowMock.mockResolvedValue({ id: workflowId, enabled: false });
    updateWorkflowMock.mockResolvedValue({
      id: workflowId,
      enabled: false,
      validationErrors: ['Workflow has no valid definition'],
    });

    const result = await runAutomationHandler(buildDeps());

    expect(executeWorkflow).not.toHaveBeenCalled();
    expect(result.started).toBe(false);
    expect(result.reason).toContain('could not be enabled');
    expect(result.reason).toContain('Workflow has no valid definition');
  });
});
