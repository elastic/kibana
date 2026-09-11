/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { ExecutionError } from '@kbn/workflows/server';
import { createVerifyKiStepDefinition } from './verify_ki_step';
import { ESQL_VALID_RUNTIME_VERIFIER_ID, ESQL_VALID_SYNTAX_VERIFIER_ID } from '../ki_verification';
import type { KiVerifierWorkflowRunner } from '../ki_verification';
import { mockKiStepTelemetry } from './test_utils';

type VerifyKiHandler = ReturnType<typeof createVerifyKiStepDefinition>['handler'];
type VerifyKiHandlerContext = Parameters<VerifyKiHandler>[0];
type VerifyKiVerifiers = VerifyKiHandlerContext['input']['verifiers'];
type EsClientMock = ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

const esResponseError = (type: string, reason: string) =>
  new errors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode: 400,
      body: { error: { type, reason } },
    })
  );

const makeHandlerContext = (
  ki: VerifyKiHandlerContext['input']['ki'],
  esClient: EsClientMock,
  {
    verifiers,
    getScopedEsClient,
    metadata,
    parent,
  }: {
    verifiers?: VerifyKiVerifiers;
    getScopedEsClient?: () => unknown;
    metadata?: Record<string, unknown>;
    parent?: { workflowId: string; executionId: string };
  } = {}
): VerifyKiHandlerContext =>
  ({
    input: { ki, verifiers },
    config: {},
    rawInput: { ki, verifiers },
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue({ headers: {} }),
      getScopedEsClient: getScopedEsClient ?? jest.fn().mockReturnValue(esClient),
      getContext: jest.fn().mockReturnValue({
        workflow: { id: 'parent-wf', spaceId: 'space-a' },
        metadata,
        parent,
      }),
    },
    logger: loggingSystemMock.createLogger(),
    abortSignal: new AbortController().signal,
    stepId: 'verify_ki',
    stepType: 'context-engine.verifyKi',
  } as unknown as VerifyKiHandlerContext);

describe('verify_ki workflow step', () => {
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let uiSettingsGet: jest.Mock;
  let esClient: EsClientMock;
  let telemetry: ReturnType<typeof mockKiStepTelemetry>;
  let workflowsManagement: jest.Mocked<KiVerifierWorkflowRunner>;
  let checkExecutePrivilege: jest.Mock;

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
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({ columns: [], values: [] });
    telemetry = mockKiStepTelemetry();
    workflowsManagement = {
      getWorkflow: jest.fn().mockImplementation(async (id: string) => ({
        id,
        name: id,
        enabled: true,
        valid: true,
        managed: false,
        definition: { name: id, triggers: [{ type: 'manual' }], steps: [] },
        yaml: '',
      })),
      runWorkflow: jest.fn().mockResolvedValue('exec-1'),
      getWorkflowExecution: jest.fn(),
      cancelWorkflowExecution: jest.fn(),
    };
    checkExecutePrivilege = jest.fn().mockResolvedValue(true);
  });

  const makeDefinition = (withWorkflows = true) =>
    createVerifyKiStepDefinition(
      coreSetup,
      telemetry.logger,
      telemetry.analyticsService,
      withWorkflows ? { workflowsManagement, checkExecutePrivilege } : undefined
    );

  const runHandler = async (
    ki: VerifyKiHandlerContext['input']['ki'],
    opts: {
      verifiers?: VerifyKiVerifiers;
      metadata?: Record<string, unknown>;
      parent?: { workflowId: string; executionId: string };
    } = {}
  ) => {
    const { output } = await makeDefinition().handler(makeHandlerContext(ki, esClient, opts));
    if (!output) {
      throw new Error('step returned no output');
    }
    return output;
  };

  const ALL_ESQL_VERIFIERS: VerifyKiVerifiers = [
    ESQL_VALID_SYNTAX_VERIFIER_ID,
    ESQL_VALID_RUNTIME_VERIFIER_ID,
  ];

  it.each([
    {
      caseName: 'missing',
      verifiers: undefined,
      message: 'verifiers must list at least one verifier id',
    },
    {
      caseName: 'duplicate',
      verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID, ESQL_VALID_SYNTAX_VERIFIER_ID],
      message: `Duplicate verifier id: "${ESQL_VALID_SYNTAX_VERIFIER_ID}"`,
    },
    {
      caseName: 'unknown',
      verifiers: ['unknown-verifier'],
      message: 'Unknown verifier id: "unknown-verifier"',
    },
  ])(
    'fails with an input validation error for a $caseName verifier',
    async ({ verifiers, message }) => {
      setContextEngineEnabled(true);

      const thrown = await runHandler(
        { attributes: { esql: 'FROM logs-* | LIMIT 10' } },
        { verifiers: verifiers as unknown as VerifyKiVerifiers }
      ).catch((error) => error);

      expect(thrown).toBeInstanceOf(ExecutionError);
      expect(thrown.type).toBe('InputValidationError');
      expect(thrown.message).toBe(message);
      expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
        outcome: 'failure',
        errorType: 'InputValidationError',
      });
    }
  );

  it('reports both verifiers passing when syntax and runtime validation succeed', async () => {
    setContextEngineEnabled(true);

    const output = await runHandler(
      {
        type: 'detection',
        attributes: { esql: 'FROM logs-* | WHERE event.outcome == "failure" | LIMIT 10' },
      },
      { verifiers: ALL_ESQL_VERIFIERS }
    );

    expect(output.passed).toBe(true);
    expect(output.results).toEqual([
      { verifier: ESQL_VALID_SYNTAX_VERIFIER_ID, passed: true },
      { verifier: ESQL_VALID_RUNTIME_VERIFIER_ID, passed: true },
    ]);
  });

  it('hands the scoped Elasticsearch client to the verifiers that need one', async () => {
    setContextEngineEnabled(true);

    await runHandler(
      { attributes: { esql: 'FROM logs-* | LIMIT 10' } },
      { verifiers: [ESQL_VALID_RUNTIME_VERIFIER_ID] }
    );

    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
  });

  it('reports both verifiers failing when syntax and runtime validation fail', async () => {
    setContextEngineEnabled(true);
    esClient.esql.query.mockRejectedValue(
      esResponseError('parsing_exception', 'Unknown function [NOT_A_FUNCTION]')
    );

    const output = await runHandler(
      { attributes: { esql: 'FROM logs-* | EVAL x = NOT_A_FUNCTION(1)' } },
      { verifiers: ALL_ESQL_VERIFIERS }
    );

    expect(output.passed).toBe(false);
    expect(output.results).toEqual([
      {
        verifier: ESQL_VALID_SYNTAX_VERIFIER_ID,
        passed: false,
        reason: expect.stringContaining('NOT_A_FUNCTION'),
      },
      {
        verifier: ESQL_VALID_RUNTIME_VERIFIER_ID,
        passed: false,
        reason: expect.stringContaining('Unknown function [NOT_A_FUNCTION]'),
      },
    ]);
  });

  it('reports mixed results when syntax passes but runtime validation fails', async () => {
    setContextEngineEnabled(true);
    esClient.esql.query.mockRejectedValue(
      esResponseError('verification_exception', 'Unknown column [made_up_field]')
    );

    const output = await runHandler(
      { attributes: { esql: 'FROM logs-* | WHERE made_up_field > 1' } },
      { verifiers: ALL_ESQL_VERIFIERS }
    );

    expect(output.passed).toBe(false);
    expect(output.results).toEqual([
      { verifier: ESQL_VALID_SYNTAX_VERIFIER_ID, passed: true },
      {
        verifier: ESQL_VALID_RUNTIME_VERIFIER_ID,
        passed: false,
        reason: expect.stringContaining('Unknown column [made_up_field]'),
      },
    ]);
  });

  it('passes with empty results when no verifier applies to the KI', async () => {
    setContextEngineEnabled(true);

    const output = await runHandler({ title: 'no esql here' }, { verifiers: ALL_ESQL_VERIFIERS });

    expect(output).toEqual({ passed: true, results: [] });
  });

  it('runs only the listed verifier when a subset is specified', async () => {
    setContextEngineEnabled(true);

    const output = await runHandler(
      { attributes: { esql: 'FROM logs-* | LIMIT 10' } },
      { verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID] }
    );

    expect(output.results).toEqual([{ verifier: ESQL_VALID_SYNTAX_VERIFIER_ID, passed: true }]);
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });

  it('throws when the Context Engine setting is off', async () => {
    setContextEngineEnabled(false);

    await expect(
      runHandler({ attributes: { esql: 'FROM logs-* | EVAL x = NOT_A_FUNCTION(1)' } })
    ).rejects.toThrow('Context Engine is disabled');
  });

  it('reports a passed verification', async () => {
    setContextEngineEnabled(true);

    await runHandler(
      { attributes: { esql: 'FROM logs-* | WHERE event.outcome == "failure" | LIMIT 10' } },
      { verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID] }
    );

    expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledTimes(1);
    expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
      outcome: 'success',
      passed: true,
      verifiersRun: 1,
      failedVerifierIds: [],
      failedWorkflowVerifierCount: 0,
    });
    expect(telemetry.logger.debug).toHaveBeenCalledTimes(1);
    expect(telemetry.logger.debug).toHaveBeenCalledWith(
      'KI verification passed (verifiers run: 1)'
    );
  });

  it('reports failed verifier ids on failure', async () => {
    setContextEngineEnabled(true);

    await runHandler(
      { attributes: { esql: 'FROM logs-* | EVAL x = NOT_A_FUNCTION(1)' } },
      { verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID] }
    );

    expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledTimes(1);
    expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
      outcome: 'success',
      passed: false,
      verifiersRun: 1,
      failedVerifierIds: [ESQL_VALID_SYNTAX_VERIFIER_ID],
      failedWorkflowVerifierCount: 0,
    });
  });

  it('logs failing verifier ids on failure', async () => {
    setContextEngineEnabled(true);

    await runHandler(
      { attributes: { esql: 'FROM logs-* | EVAL x = NOT_A_FUNCTION(1)' } },
      { verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID] }
    );

    expect(telemetry.logger.debug).toHaveBeenCalledTimes(1);
    const [message] = (telemetry.logger.debug as jest.Mock).mock.calls[0];
    expect(message).toContain(ESQL_VALID_SYNTAX_VERIFIER_ID);
    expect(message).not.toContain('NOT_A_FUNCTION');
  });

  it('reports a zero verifier count when no verifier applied', async () => {
    setContextEngineEnabled(true);

    await runHandler({ title: 'no esql here' }, { verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID] });

    expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
      outcome: 'success',
      passed: true,
      verifiersRun: 0,
      failedVerifierIds: [],
      failedWorkflowVerifierCount: 0,
    });
  });

  it('reports an aborted run when cancelled', async () => {
    setContextEngineEnabled(true);
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';
    const context = makeHandlerContext({ attributes: { esql: 'FROM logs-*' } }, esClient, {
      verifiers: [ESQL_VALID_RUNTIME_VERIFIER_ID],
      getScopedEsClient: () => {
        throw abortError;
      },
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
    const context = makeHandlerContext({ attributes: { esql: 'FROM logs-*' } }, esClient, {
      verifiers: [ESQL_VALID_RUNTIME_VERIFIER_ID],
      getScopedEsClient: () => {
        throw new TypeError('boom');
      },
    });

    await expect(makeDefinition().handler(context)).rejects.toThrow('boom');

    expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
      outcome: 'failure',
      errorType: 'TypeError',
    });
    expect(telemetry.logger.debug).toHaveBeenCalledWith('KI verification errored: TypeError');
  });

  it('emits no telemetry event when the Context Engine setting is off', async () => {
    setContextEngineEnabled(false);

    await expect(runHandler({ attributes: { esql: 'FROM logs-*' } })).rejects.toThrow();

    expect(telemetry.analyticsService.reportKiVerification).not.toHaveBeenCalled();
  });

  describe('custom verifier workflows', () => {
    const validEsql = 'FROM logs-* | WHERE event.outcome == "failure" | LIMIT 10';

    const completedWith = (output: unknown): WorkflowExecutionDto =>
      ({
        status: ExecutionStatus.COMPLETED,
        error: null,
        context: { output },
      } as unknown as WorkflowExecutionDto);

    it('runs built-in and workflow verifiers in declaration order', async () => {
      setContextEngineEnabled(true);
      workflowsManagement.getWorkflowExecution
        .mockResolvedValueOnce(completedWith({ passed: true }) as never)
        .mockResolvedValueOnce(completedWith({ passed: false, reason: 'has PII' }) as never);

      const output = await runHandler(
        { attributes: { esql: validEsql } },
        {
          verifiers: [
            { workflow_id: 'esql-returns-rows' },
            ESQL_VALID_SYNTAX_VERIFIER_ID,
            { workflow_id: 'no-pii' },
          ],
        }
      );

      expect(output.passed).toBe(false);
      expect(output.results).toEqual([
        { verifier: 'workflow:esql-returns-rows', passed: true },
        { verifier: ESQL_VALID_SYNTAX_VERIFIER_ID, passed: true },
        { verifier: 'workflow:no-pii', passed: false, reason: 'has PII' },
      ]);
    });

    it('runs the workflow in the executing space with the step request', async () => {
      setContextEngineEnabled(true);
      workflowsManagement.getWorkflowExecution.mockResolvedValue(completedWith({ passed: true }));

      await runHandler({ title: 'x' }, { verifiers: [{ workflow_id: 'no-pii', timeout_sec: 15 }] });

      expect(workflowsManagement.getWorkflow).toHaveBeenCalledWith('no-pii', 'space-a');
      expect(workflowsManagement.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'no-pii' }),
        'space-a',
        { ki: { title: 'x' } },
        { headers: {} },
        'context-engine:verify-ki',
        expect.anything()
      );
    });

    it('skips workflow verifiers whose applies_to does not match', async () => {
      setContextEngineEnabled(true);

      const output = await runHandler(
        { type: 'faq' },
        { verifiers: [{ workflow_id: 'runbook-only', applies_to: { types: ['runbook'] } }] }
      );

      expect(workflowsManagement.runWorkflow).not.toHaveBeenCalled();
      expect(output).toEqual({ passed: true, results: [] });
    });

    it('reports a duplicate workflow verifier as an input validation error', async () => {
      setContextEngineEnabled(true);

      const thrown = await runHandler(
        { title: 'x' },
        { verifiers: [{ workflow_id: 'no-pii' }, { workflow_id: 'no-pii' }] }
      ).catch((error) => error);

      expect(thrown).toBeInstanceOf(ExecutionError);
      expect(thrown.type).toBe('InputValidationError');
      expect(thrown.message).toBe('Duplicate verifier id: "workflow:no-pii"');
    });

    it('fails the step when a verifier workflow does not exist', async () => {
      setContextEngineEnabled(true);
      workflowsManagement.getWorkflow.mockResolvedValue(null);

      await expect(
        runHandler({ title: 'x' }, { verifiers: [{ workflow_id: 'missing' }] })
      ).rejects.toThrow("Verifier workflow 'missing' not found");
      expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
        outcome: 'failure',
        errorType: 'NotFoundError',
      });
    });

    it('records custom verifier failures as "workflow" in telemetry, not the workflow id', async () => {
      setContextEngineEnabled(true);
      workflowsManagement.getWorkflowExecution.mockResolvedValue(
        completedWith({ passed: false, reason: 'nope' })
      );

      await runHandler(
        { attributes: { esql: 'FROM logs-* | EVAL x = NOT_A_FUNCTION(1)' } },
        { verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID, { workflow_id: 'no-pii' }] }
      );

      expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
        outcome: 'success',
        passed: false,
        verifiersRun: 2,
        failedVerifierIds: [ESQL_VALID_SYNTAX_VERIFIER_ID, 'workflow'],
        failedWorkflowVerifierCount: 1,
      });
    });

    it('passes the list of caller workflow ids to the child so it can detect cycles', async () => {
      setContextEngineEnabled(true);
      workflowsManagement.getWorkflowExecution.mockResolvedValue(completedWith({ passed: true }));

      await runHandler(
        { title: 'x' },
        { verifiers: [{ workflow_id: 'no-pii' }], metadata: { ki_verifier_chain: ['root-wf'] } }
      );

      expect(workflowsManagement.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'space-a',
        expect.anything(),
        expect.anything(),
        'context-engine:verify-ki',
        { ki_verifier_chain: ['root-wf', 'parent-wf'] }
      );
    });

    it('rejects a verifier workflow that names the current workflow', async () => {
      setContextEngineEnabled(true);

      const thrown = await runHandler(
        { title: 'x' },
        { verifiers: [{ workflow_id: 'parent-wf' }] }
      ).catch((error) => error);

      expect(thrown).toBeInstanceOf(ExecutionError);
      expect(thrown.type).toBe('InputValidationError');
      expect(thrown.message).toBe(
        "Verifier workflow 'parent-wf' would call itself (chain: parent-wf -> parent-wf)"
      );
      expect(workflowsManagement.runWorkflow).not.toHaveBeenCalled();
    });

    it('rejects a verifier workflow already in the calling chain', async () => {
      setContextEngineEnabled(true);

      const thrown = await runHandler(
        { title: 'x' },
        { verifiers: [{ workflow_id: 'root-wf' }], metadata: { ki_verifier_chain: ['root-wf'] } }
      ).catch((error) => error);

      expect(thrown.type).toBe('InputValidationError');
      expect(thrown.message).toBe(
        "Verifier workflow 'root-wf' would call itself (chain: root-wf -> parent-wf -> root-wf)"
      );
      expect(workflowsManagement.runWorkflow).not.toHaveBeenCalled();
    });

    it('blocks a cycle even when the loop runs through a workflow.execute step', async () => {
      // root-wf verified via verifier-wf, which ran this workflow via workflow.execute.
      // Naming root-wf again must be a cycle.
      setContextEngineEnabled(true);
      workflowsManagement.getWorkflowExecution.mockResolvedValueOnce({
        workflowId: 'verifier-wf',
        context: { metadata: { ki_verifier_chain: ['root-wf'] } },
      } as unknown as WorkflowExecutionDto);

      const thrown = await runHandler(
        { title: 'x' },
        {
          verifiers: [{ workflow_id: 'root-wf' }],
          parent: { workflowId: 'verifier-wf', executionId: 'verifier-exec' },
        }
      ).catch((error) => error);

      expect(workflowsManagement.getWorkflowExecution).toHaveBeenCalledWith(
        'verifier-exec',
        'space-a'
      );
      expect(thrown.type).toBe('InputValidationError');
      expect(thrown.message).toBe(
        "Verifier workflow 'root-wf' would call itself (chain: root-wf -> verifier-wf -> parent-wf -> root-wf)"
      );
      expect(workflowsManagement.runWorkflow).not.toHaveBeenCalled();
    });

    it('blocks the run when a parent workflow run record cannot be read', async () => {
      setContextEngineEnabled(true);
      workflowsManagement.getWorkflowExecution.mockResolvedValueOnce(null);

      await expect(
        runHandler(
          { title: 'x' },
          {
            verifiers: [{ workflow_id: 'no-pii' }],
            parent: { workflowId: 'verifier-wf', executionId: 'gone' },
          }
        )
      ).rejects.toThrow("parent workflow run 'gone' is not readable");
      expect(workflowsManagement.runWorkflow).not.toHaveBeenCalled();
    });

    it('rejects verifier workflows nested beyond the maximum depth', async () => {
      setContextEngineEnabled(true);

      const thrown = await runHandler(
        { title: 'x' },
        {
          verifiers: [{ workflow_id: 'deeper' }],
          metadata: { ki_verifier_chain: ['a', 'b', 'c', 'd', 'e'] },
        }
      ).catch((error) => error);

      expect(thrown.type).toBe('InputValidationError');
      expect(thrown.message).toContain('nested too deeply');
      expect(workflowsManagement.runWorkflow).not.toHaveBeenCalled();
    });

    it('lets built-ins run at any depth', async () => {
      setContextEngineEnabled(true);

      const output = await runHandler(
        { attributes: { esql: validEsql } },
        {
          verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID],
          metadata: { ki_verifier_chain: ['a', 'b', 'c'] },
        }
      );

      expect(output.passed).toBe(true);
    });

    it('checks the execute privilege in the executing space before dispatching', async () => {
      setContextEngineEnabled(true);
      workflowsManagement.getWorkflowExecution.mockResolvedValue(completedWith({ passed: true }));

      await runHandler({ title: 'x' }, { verifiers: [{ workflow_id: 'no-pii' }] });

      expect(checkExecutePrivilege).toHaveBeenCalledWith({ headers: {} }, 'space-a');
    });

    it('throws a permission error and dispatches nothing when execute is denied', async () => {
      setContextEngineEnabled(true);
      checkExecutePrivilege.mockResolvedValue(false);

      const thrown = await runHandler(
        { attributes: { esql: validEsql } },
        { verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID, { workflow_id: 'no-pii' }] }
      ).catch((error) => error);

      expect(thrown).toBeInstanceOf(ExecutionError);
      expect(thrown.type).toBe('PermissionError');
      expect(workflowsManagement.runWorkflow).not.toHaveBeenCalled();
      expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
        outcome: 'failure',
        errorType: 'PermissionError',
      });
    });

    it('skips the execute privilege check when only built-ins are listed', async () => {
      setContextEngineEnabled(true);
      checkExecutePrivilege.mockResolvedValue(false);

      const output = await runHandler(
        { attributes: { esql: validEsql } },
        { verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID] }
      );

      expect(checkExecutePrivilege).not.toHaveBeenCalled();
      expect(output.passed).toBe(true);
    });

    it('collapses multiple failing custom verifiers into one "workflow" telemetry entry', async () => {
      setContextEngineEnabled(true);
      workflowsManagement.getWorkflowExecution.mockResolvedValue(
        completedWith({ passed: false, reason: 'nope' })
      );

      await runHandler(
        { title: 'x' },
        { verifiers: [{ workflow_id: 'no-pii' }, { workflow_id: 'has-owner' }] }
      );

      expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          verifiersRun: 2,
          failedVerifierIds: ['workflow'],
          failedWorkflowVerifierCount: 2,
        })
      );
    });

    it('throws when a workflow verifier is listed but workflowsManagement is unavailable', async () => {
      setContextEngineEnabled(true);

      await expect(
        makeDefinition(false).handler(
          makeHandlerContext({ title: 'x' }, esClient, { verifiers: [{ workflow_id: 'no-pii' }] })
        )
      ).rejects.toThrow('workflowsManagement plugin');
      expect(telemetry.analyticsService.reportKiVerification).toHaveBeenCalledWith({
        outcome: 'failure',
        errorType: 'FeatureDisabledError',
      });
    });

    it('runs built-ins without workflowsManagement when no workflow verifier is listed', async () => {
      setContextEngineEnabled(true);

      const { output } = await makeDefinition(false).handler(
        makeHandlerContext({ attributes: { esql: validEsql } }, esClient, {
          verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID],
        })
      );

      expect(output?.results).toEqual([{ verifier: ESQL_VALID_SYNTAX_VERIFIER_ID, passed: true }]);
    });
  });
});
