/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, type estypes } from '@elastic/elasticsearch';
import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { createVerifyKiStepDefinition } from './verify_ki_step';
import {
  ESQL_VALID_RUNTIME_VERIFIER_ID,
  ESQL_VALID_SCHEMA_VERIFIER_ID,
  ESQL_VALID_SYNTAX_VERIFIER_ID,
} from '../ki_verification';
import { mockKiStepTelemetry } from './test_utils';

type VerifyKiHandler = ReturnType<typeof createVerifyKiStepDefinition>['handler'];
type VerifyKiHandlerContext = Parameters<VerifyKiHandler>[0];
type EsClientMock = ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
interface HandlerOptions {
  verifiers?: string[];
  options?: VerifyKiHandlerContext['input']['options'];
  abortSignal?: AbortSignal;
  getScopedEsClient?: () => unknown;
}

const createPolicyResponse = (): estypes.EnrichGetPolicyResponse => ({ policies: [] });

const esResponseError = (type: string, reason: string, statusCode: number) =>
  new errors.ResponseError(
    elasticsearchClientMock.createApiResponse({ statusCode, body: { error: { type, reason } } })
  );

const makeHandlerContext = (
  ki: VerifyKiHandlerContext['input']['ki'],
  esClient: EsClientMock,
  { verifiers, options, abortSignal, getScopedEsClient }: HandlerOptions = {}
): VerifyKiHandlerContext =>
  ({
    input: { ki, verifiers, options },
    config: {},
    rawInput: { ki, verifiers, options },
    contextManager: {
      getFakeRequest: jest.fn(),
      getScopedEsClient: getScopedEsClient ?? jest.fn().mockReturnValue(esClient),
    },
    logger: loggingSystemMock.createLogger(),
    abortSignal: abortSignal ?? new AbortController().signal,
    stepId: 'verify_ki',
    stepType: 'context-engine.verifyKi',
  } as unknown as VerifyKiHandlerContext);

describe('verify_ki workflow step', () => {
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let uiSettingsGet: jest.Mock;
  let esClient: EsClientMock;
  let telemetry: ReturnType<typeof mockKiStepTelemetry>;

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
    esClient.fieldCaps.mockResolvedValue({ indices: ['logs-2026'], fields: {} });
    esClient.esql.query.mockImplementation(async (request) => ({
      columns: request?.query.includes('LIMIT 0')
        ? [{ name: 'event.outcome', type: 'keyword' }]
        : [],
      values: [],
    }));
    esClient.enrich.getPolicy.mockResolvedValue(createPolicyResponse());
    telemetry = mockKiStepTelemetry();
  });

  const makeDefinition = () =>
    createVerifyKiStepDefinition(coreSetup, telemetry.logger, telemetry.analyticsService);

  const runHandler = async (
    ki: VerifyKiHandlerContext['input']['ki'],
    opts: HandlerOptions = {}
  ) => {
    const { output } = await makeDefinition().handler(makeHandlerContext(ki, esClient, opts));
    if (!output) {
      throw new Error('step returned no output');
    }
    return output;
  };

  const ALL_ESQL_VERIFIERS = [
    ESQL_VALID_SYNTAX_VERIFIER_ID,
    ESQL_VALID_RUNTIME_VERIFIER_ID,
    ESQL_VALID_SCHEMA_VERIFIER_ID,
  ];

  it('throws when verifiers is not specified', async () => {
    setContextEngineEnabled(true);

    await expect(runHandler({ attributes: { esql: 'FROM logs-* | LIMIT 10' } })).rejects.toThrow(
      'verifiers must list at least one verifier id'
    );
  });

  it('passes a KI with valid ES|QL', async () => {
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
      { verifier: ESQL_VALID_SCHEMA_VERIFIER_ID, passed: true },
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

  it('forwards schema options and still verifies index existence when fields are disabled', async () => {
    setContextEngineEnabled(true);

    const output = await runHandler(
      { attributes: { esql: 'FROM logs-* | WHERE missing > 0' } },
      {
        verifiers: [ESQL_VALID_SCHEMA_VERIFIER_ID],
        options: { 'esql-valid-schema': { field_verification: 'disabled' } },
      }
    );

    expect(output).toEqual({
      passed: true,
      results: [{ verifier: ESQL_VALID_SCHEMA_VERIFIER_ID, passed: true }],
    });
    expect(esClient.esql.query).toHaveBeenCalled();
    expect(esClient.fieldCaps).toHaveBeenCalled();
  });

  it('propagates infrastructure failures raised during semantic validation', async () => {
    setContextEngineEnabled(true);
    esClient.esql.query.mockImplementation(async (request) => {
      if (request?.query.includes('lookup_index')) {
        throw esResponseError('too_many_requests', 'metadata throttled', 429);
      }
      return { columns: [{ name: 'event.outcome', type: 'keyword' }], values: [] };
    });

    await expect(
      runHandler(
        {
          attributes: {
            esql: 'FROM logs-* | LOOKUP JOIN lookup_index ON event.outcome',
          },
        },
        { verifiers: [ESQL_VALID_SCHEMA_VERIFIER_ID] }
      )
    ).rejects.toBeInstanceOf(errors.ResponseError);
  });

  it('propagates cancellation during schema metadata retrieval', async () => {
    setContextEngineEnabled(true);
    const abortController = new AbortController();
    esClient.esql.query.mockImplementation(async (_request, options) => {
      abortController.abort();
      options?.signal?.throwIfAborted();
      return { columns: [], values: [] };
    });

    await expect(
      runHandler(
        { attributes: { esql: 'FROM logs-*' } },
        {
          verifiers: [ESQL_VALID_SCHEMA_VERIFIER_ID],
          abortSignal: abortController.signal,
        }
      )
    ).rejects.toThrow(/abort/i);
  });

  it('fails a KI with invalid ES|QL and reports the reason', async () => {
    setContextEngineEnabled(true);

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
      { verifier: ESQL_VALID_RUNTIME_VERIFIER_ID, passed: true },
      {
        verifier: ESQL_VALID_SCHEMA_VERIFIER_ID,
        passed: false,
        reason: expect.stringContaining('NOT_A_FUNCTION'),
      },
    ]);
  });

  it('skips KIs with no applicable verifiers', async () => {
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

  it('reports no event when the setting is off', async () => {
    setContextEngineEnabled(false);

    await expect(runHandler({ attributes: { esql: 'FROM logs-*' } })).rejects.toThrow();

    expect(telemetry.analyticsService.reportKiVerification).not.toHaveBeenCalled();
  });
});
