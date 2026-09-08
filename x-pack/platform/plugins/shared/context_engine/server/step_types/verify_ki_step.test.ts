/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { createVerifyKiStepDefinition } from './verify_ki_step';
import { ESQL_VALID_SYNTAX_VERIFIER_ID } from '../ki_verification';
import type { KiVerifierWorkflowRunner } from '../ki_verification';
import { mockKiStepTelemetry } from './test_utils';

type VerifyKiHandler = ReturnType<typeof createVerifyKiStepDefinition>['handler'];
type VerifyKiHandlerContext = Parameters<VerifyKiHandler>[0];
type VerifyKiInput = VerifyKiHandlerContext['input'];

const makeHandlerContext = (
  input: VerifyKiInput,
  getScopedEsClient: () => unknown = jest.fn()
): VerifyKiHandlerContext =>
  ({
    input,
    config: {},
    rawInput: input,
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue({ headers: {} }),
      getScopedEsClient,
      getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'space-a' } }),
    },
    logger: loggingSystemMock.createLogger(),
    abortSignal: new AbortController().signal,
    stepId: 'verify_ki',
    stepType: 'context-engine.verifyKi',
  } as unknown as VerifyKiHandlerContext);

describe('verify_ki workflow step', () => {
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let uiSettingsGet: jest.Mock;
  let telemetry: ReturnType<typeof mockKiStepTelemetry>;
  let workflowsManagement: jest.Mocked<KiVerifierWorkflowRunner>;

  const setContextEngineEnabled = (isEnabled: boolean) => {
    uiSettingsGet.mockResolvedValue(isEnabled);
  };

  beforeEach(() => {
    coreSetup = coreMock.createSetup();
    const startServices = coreMock.createStart();
    uiSettingsGet = jest.fn();
    startServices.uiSettings.asScopedToClient.mockReturnValue({
      get: uiSettingsGet,
    } as unknown as ReturnType<typeof startServices.uiSettings.asScopedToClient>);
    coreSetup.getStartServices.mockResolvedValue([startServices, {}, undefined]);
    telemetry = mockKiStepTelemetry();
    workflowsManagement = { executeWorkflow: jest.fn(), cancelWorkflowExecution: jest.fn() };
  });

  const makeDefinition = (withWorkflows = true) =>
    createVerifyKiStepDefinition(
      coreSetup,
      telemetry.logger,
      telemetry.analyticsService,
      withWorkflows ? workflowsManagement : undefined
    );

  const runHandler = async (ki: VerifyKiInput['ki'], verifiers?: VerifyKiInput['verifiers']) => {
    const { output } = await makeDefinition().handler(makeHandlerContext({ ki, verifiers }));
    if (!output) {
      throw new Error('step returned no output');
    }
    return output;
  };

  const completedWith = (output: unknown) => ({
    workflowExecutionId: 'exec-1',
    execution: { status: ExecutionStatus.COMPLETED, error: null, context: { output } },
  });

  it('passes a KI with valid ES|QL', async () => {
    setContextEngineEnabled(true);

    const output = await runHandler({
      type: 'detection',
      attributes: { esql: 'FROM logs-* | WHERE event.outcome == "failure" | LIMIT 10' },
    });

    expect(output.passed).toBe(true);
    expect(output.results).toEqual([{ verifier: ESQL_VALID_SYNTAX_VERIFIER_ID, passed: true }]);
  });

  it('fails a KI with invalid ES|QL and reports the reason', async () => {
    setContextEngineEnabled(true);

    const output = await runHandler({
      attributes: { esql: 'FROM logs-* | EVAL x = NOT_A_FUNCTION(1)' },
    });

    expect(output.passed).toBe(false);
    expect(output.results).toEqual([
      {
        verifier: ESQL_VALID_SYNTAX_VERIFIER_ID,
        passed: false,
        reason: expect.stringContaining('NOT_A_FUNCTION'),
      },
    ]);
  });

  it('skips KIs with no applicable verifiers', async () => {
    setContextEngineEnabled(true);

    const output = await runHandler({ title: 'no esql here' });

    expect(output).toEqual({ passed: true, results: [] });
  });

  it('throws when the Context Engine setting is off', async () => {
    setContextEngineEnabled(false);

    await expect(
      runHandler({ attributes: { esql: 'FROM logs-* | EVAL x = NOT_A_FUNCTION(1)' } })
    ).rejects.toThrow('Context Engine is disabled');
  });

  it('reports a passed verification', async () => {
    setContextEngineEnabled(true);

    await runHandler({
      attributes: { esql: 'FROM logs-* | WHERE event.outcome == "failure" | LIMIT 10' },
    });

    expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledTimes(1);
    expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
      outcome: 'success',
      passed: true,
      verifiersRun: 1,
      failedVerifierIds: [],
    });
    expect(telemetry.logger.debug).toHaveBeenCalledTimes(1);
    expect(telemetry.logger.debug).toHaveBeenCalledWith(
      'KI verification passed (verifiers run: 1)'
    );
  });

  it('reports failed verifier ids on failure', async () => {
    setContextEngineEnabled(true);

    await runHandler({ attributes: { esql: 'FROM logs-* | EVAL x = NOT_A_FUNCTION(1)' } });

    expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledTimes(1);
    expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
      outcome: 'success',
      passed: false,
      verifiersRun: 1,
      failedVerifierIds: [ESQL_VALID_SYNTAX_VERIFIER_ID],
    });
  });

  it('logs failing verifier ids on failure', async () => {
    setContextEngineEnabled(true);

    await runHandler({ attributes: { esql: 'FROM logs-* | EVAL x = NOT_A_FUNCTION(1)' } });

    expect(telemetry.logger.debug).toHaveBeenCalledTimes(1);
    const [message] = (telemetry.logger.debug as jest.Mock).mock.calls[0];
    expect(message).toContain(ESQL_VALID_SYNTAX_VERIFIER_ID);
    expect(message).not.toContain('NOT_A_FUNCTION');
  });

  it('reports a zero verifier count when no verifier applied', async () => {
    setContextEngineEnabled(true);

    await runHandler({ title: 'no esql here' });

    expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
      outcome: 'success',
      passed: true,
      verifiersRun: 0,
      failedVerifierIds: [],
    });
  });

  it('reports an aborted run when cancelled', async () => {
    setContextEngineEnabled(true);
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';
    const context = makeHandlerContext({ ki: { attributes: { esql: 'FROM logs-*' } } }, () => {
      throw abortError;
    });

    await expect(makeDefinition().handler(context)).rejects.toThrow(abortError);

    expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
      outcome: 'aborted',
      errorType: undefined,
    });
    expect(telemetry.logger.debug).toHaveBeenCalledWith('KI verification aborted');
  });

  it('reports a failure when the run errors', async () => {
    setContextEngineEnabled(true);
    const context = makeHandlerContext({ ki: { attributes: { esql: 'FROM logs-*' } } }, () => {
      throw new TypeError('boom');
    });

    await expect(makeDefinition().handler(context)).rejects.toThrow('boom');

    expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
      outcome: 'failure',
      errorType: 'TypeError',
    });
    expect(telemetry.logger.debug).toHaveBeenCalledWith('KI verification errored: TypeError');
  });

  it('reports no event when the setting is off', async () => {
    setContextEngineEnabled(false);

    await expect(runHandler({ attributes: { esql: 'FROM logs-*' } })).rejects.toThrow();

    expect(telemetry.analyticsService.reportKiVerification).not.toHaveBeenCalled();
  });

  describe('custom verifier workflows', () => {
    const validEsql = 'FROM logs-* | WHERE event.outcome == "failure" | LIMIT 10';

    it('aggregates workflow verifiers after the built-ins', async () => {
      setContextEngineEnabled(true);
      workflowsManagement.executeWorkflow
        .mockResolvedValueOnce(completedWith({ passed: true }) as never)
        .mockResolvedValueOnce(completedWith({ passed: false, reason: 'has PII' }) as never);

      const output = await runHandler({ attributes: { esql: validEsql } }, [
        { workflow_id: 'esql-returns-rows' },
        { workflow_id: 'no-pii' },
      ]);

      expect(output.passed).toBe(false);
      expect(output.results).toEqual([
        { verifier: ESQL_VALID_SYNTAX_VERIFIER_ID, passed: true },
        { verifier: 'workflow:esql-returns-rows', passed: true },
        { verifier: 'workflow:no-pii', passed: false, reason: 'has PII' },
      ]);
    });

    it('runs the workflow in the executing space with the step request', async () => {
      setContextEngineEnabled(true);
      workflowsManagement.executeWorkflow.mockResolvedValue(
        completedWith({ passed: true }) as never
      );

      await runHandler({ title: 'x' }, [{ workflow_id: 'no-pii', timeout_sec: 15 }]);

      expect(workflowsManagement.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'no-pii',
          inputs: { ki: { title: 'x' } },
          request: { headers: {} },
          spaceId: 'space-a',
          completionTimeoutSec: 15,
        })
      );
    });

    it('skips workflow verifiers whose applies_to does not match', async () => {
      setContextEngineEnabled(true);

      const output = await runHandler({ type: 'faq' }, [
        { workflow_id: 'runbook-only', applies_to: { types: ['runbook'] } },
      ]);

      expect(workflowsManagement.executeWorkflow).not.toHaveBeenCalled();
      expect(output).toEqual({ passed: true, results: [] });
    });

    it('fails the KI when executeWorkflow throws', async () => {
      setContextEngineEnabled(true);
      workflowsManagement.executeWorkflow.mockRejectedValue(new Error('Workflow not found'));

      const output = await runHandler({ title: 'x' }, [{ workflow_id: 'missing' }]);

      expect(output.passed).toBe(false);
      expect(output.results).toEqual([
        { verifier: 'workflow:missing', passed: false, reason: 'Workflow not found' },
      ]);
    });

    it('reports custom verifier failures by kind, not id', async () => {
      setContextEngineEnabled(true);
      workflowsManagement.executeWorkflow.mockResolvedValue(
        completedWith({ passed: false, reason: 'nope' }) as never
      );

      await runHandler({ attributes: { esql: 'FROM logs-* | EVAL x = NOT_A_FUNCTION(1)' } }, [
        { workflow_id: 'no-pii' },
      ]);

      expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
        outcome: 'success',
        passed: false,
        verifiersRun: 2,
        failedVerifierIds: [ESQL_VALID_SYNTAX_VERIFIER_ID, 'workflow'],
      });
    });

    it('throws when verifiers are declared but workflowsManagement is unavailable', async () => {
      setContextEngineEnabled(true);

      await expect(
        makeDefinition(false).handler(
          makeHandlerContext({ ki: { title: 'x' }, verifiers: [{ workflow_id: 'no-pii' }] })
        )
      ).rejects.toThrow('workflowsManagement plugin');
    });

    it('runs built-ins without workflowsManagement when no verifiers are declared', async () => {
      setContextEngineEnabled(true);

      const { output } = await makeDefinition(false).handler(
        makeHandlerContext({ ki: { attributes: { esql: validEsql } } })
      );

      expect(output?.results).toEqual([{ verifier: ESQL_VALID_SYNTAX_VERIFIER_ID, passed: true }]);
    });
  });
});
