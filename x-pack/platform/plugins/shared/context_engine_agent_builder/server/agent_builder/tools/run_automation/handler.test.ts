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

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn().mockResolvedValue(undefined),
}));

const { hasWorkflowExecutePrivilege, hasWorkflowUpdatePrivilege, executeWorkflow } =
  jest.requireMock('@kbn/agent-builder-tools-base/workflows');

const { assertContextEngineWriteAccess } = jest.requireMock(
  '../../assert_context_engine_write_access'
);

describe('runAutomationHandler', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();
  const spaceId = 'default';
  const workflowId = 'wf-123';

  const getWorkflowMock = jest.fn();
  const updateWorkflowMock = jest.fn();
  const getWorkflowExecutionMock = jest.fn();

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
        getWorkflowExecution: getWorkflowExecutionMock,
      } as never),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    hasWorkflowExecutePrivilege.mockResolvedValue(true);
    hasWorkflowUpdatePrivilege.mockResolvedValue(true);
    assertContextEngineWriteAccess.mockResolvedValue(undefined);
  });

  it('throws when the CE write access check fails', async () => {
    assertContextEngineWriteAccess.mockRejectedValue(
      new Error('Insufficient privileges to update Context Engine AI indices.')
    );

    await expect(runAutomationHandler(buildDeps())).rejects.toThrow(
      'Insufficient privileges to update Context Engine AI indices.'
    );
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

  it('starts a full run without inputs and without waiting', async () => {
    getWorkflowMock.mockResolvedValue({ id: workflowId, enabled: true });
    executeWorkflow.mockResolvedValue({ success: true, execution: { execution_id: 'exec-1' } });

    await runAutomationHandler(buildDeps());

    expect(executeWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ workflowParams: {}, waitForCompletion: false })
    );
  });

  describe('pilot', () => {
    const pilotWorkflow = {
      id: workflowId,
      enabled: true,
      definition: {
        triggers: [
          {
            type: 'manual',
            inputs: { properties: { pilot_size: { type: 'integer', minimum: 1, maximum: 10 } } },
          },
        ],
      },
    };

    const buildPilotDeps = () => ({ ...buildDeps(), params: { workflowId, pilotSize: 3 } });

    it('passes the pilot size as an input and waits for the run to finish', async () => {
      getWorkflowMock.mockResolvedValue(pilotWorkflow);
      executeWorkflow.mockResolvedValue({
        success: true,
        execution: {
          execution_id: 'exec-pilot',
          status: 'completed',
          started_at: '2026-10-01T10:00:00.000Z',
          finished_at: '2026-10-01T10:01:30.000Z',
        },
      });

      const result = await runAutomationHandler(buildPilotDeps());

      expect(executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowParams: { pilot_size: 3 },
          waitForCompletion: true,
          completionTimeoutSec: expect.any(Number),
        })
      );
      expect(result).toEqual(
        expect.objectContaining({
          started: true,
          executionId: 'exec-pilot',
          pilotSize: 3,
          status: 'completed',
          durationMs: 90000,
        })
      );
      expect(result.statusCheckHint).toBeUndefined();
    });

    describe('counting the KIs a pilot wrote', () => {
      const createKi = (output: Record<string, unknown>, status = 'completed') => ({
        stepId: 'create_ki',
        stepType: 'context-engine.createKi',
        status,
        output,
      });

      beforeEach(() => {
        getWorkflowMock.mockResolvedValue(pilotWorkflow);
        executeWorkflow.mockResolvedValue({
          success: true,
          execution: {
            execution_id: 'exec-pilot',
            status: 'completed',
            started_at: '2026-10-01T10:00:00.000Z',
            finished_at: '2026-10-01T10:01:30.000Z',
          },
        });
      });

      it('counts only completed createKi steps that returned an id', async () => {
        getWorkflowExecutionMock.mockResolvedValue({
          stepExecutions: [
            createKi({ id: 'pilot/a' }),
            createKi({ id: 'pilot/b' }),
            // Failed verification: the step completes but writes nothing.
            createKi({ verification: { passed: false } }),
            createKi({}, 'failed'),
            {
              stepId: 'summarize',
              stepType: 'ai.prompt',
              status: 'completed',
              output: { id: 'x' },
            },
          ],
        });

        const result = await runAutomationHandler(buildPilotDeps());

        expect(getWorkflowExecutionMock).toHaveBeenCalledWith(
          'exec-pilot',
          spaceId,
          expect.objectContaining({ includeOutput: true, request })
        );
        expect(result.kisWritten).toBe(2);
      });

      it('omits the count rather than failing when the execution cannot be read', async () => {
        getWorkflowExecutionMock.mockRejectedValue(new Error('index unavailable'));

        const result = await runAutomationHandler(buildPilotDeps());

        expect(result.started).toBe(true);
        expect(result.durationMs).toBe(90000);
        expect(result.kisWritten).toBeUndefined();
      });

      it('does not read the execution for a full run', async () => {
        getWorkflowMock.mockResolvedValue({ id: workflowId, enabled: true });
        executeWorkflow.mockResolvedValue({ success: true, execution: { execution_id: 'e' } });

        const result = await runAutomationHandler(buildDeps());

        expect(getWorkflowExecutionMock).not.toHaveBeenCalled();
        expect(result.kisWritten).toBeUndefined();
      });
    });

    it('reports the failure message when the pilot run fails', async () => {
      getWorkflowMock.mockResolvedValue(pilotWorkflow);
      executeWorkflow.mockResolvedValue({
        success: true,
        execution: {
          execution_id: 'exec-pilot',
          status: 'failed',
          started_at: '2026-10-01T10:00:00.000Z',
          finished_at: '2026-10-01T10:00:05.000Z',
          error_message: 'ES|QL syntax error',
        },
      });

      const result = await runAutomationHandler(buildPilotDeps());

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('ES|QL syntax error');
      expect(result.durationMs).toBeUndefined();
    });

    it('reports a cancelled pilot as ended without a duration to project from', async () => {
      getWorkflowMock.mockResolvedValue(pilotWorkflow);
      executeWorkflow.mockResolvedValue({
        success: true,
        execution: {
          execution_id: 'exec-pilot',
          status: 'cancelled',
          started_at: '2026-10-01T10:00:00.000Z',
          finished_at: '2026-10-01T10:00:20.000Z',
        },
      });

      const result = await runAutomationHandler(buildPilotDeps());

      expect(result.status).toBe('cancelled');
      expect(result.durationMs).toBeUndefined();
      expect(result.errorMessage).toMatch(/cancelled/);
      expect(result.statusCheckHint).toBeUndefined();
    });

    it('says the workflow was not found rather than asking for a reinstall', async () => {
      getWorkflowMock.mockResolvedValue(null);

      const result = await runAutomationHandler(buildPilotDeps());

      expect(executeWorkflow).not.toHaveBeenCalled();
      expect(result.started).toBe(false);
      expect(result.reason).toMatch(/not found/);
      expect(result.reason).not.toMatch(/reinstall/i);
    });

    it('returns the execution id to poll when the pilot outlasts the wait', async () => {
      getWorkflowMock.mockResolvedValue(pilotWorkflow);
      executeWorkflow.mockResolvedValue({
        success: true,
        execution: {
          execution_id: 'exec-slow',
          status: 'running',
          started_at: '2026-10-01T10:00:00.000Z',
        },
      });

      const result = await runAutomationHandler(buildPilotDeps());

      expect(result.status).toBe('running');
      expect(result.durationMs).toBeUndefined();
      expect(result.statusCheckHint).toContain('exec-slow');
    });

    it('refuses a pilot of a workflow that does not declare the pilot_size input', async () => {
      getWorkflowMock.mockResolvedValue({
        id: workflowId,
        enabled: true,
        definition: { triggers: [{ type: 'manual' }] },
      });

      const result = await runAutomationHandler(buildPilotDeps());

      expect(executeWorkflow).not.toHaveBeenCalled();
      expect(result.started).toBe(false);
      expect(result.reason).toMatch(/pilot_size/);
      expect(result.reason).toMatch(/document_orchestration or unit_profile/);
      expect(result.reason).toMatch(/reinstalled with the same name/);
    });
  });
});
