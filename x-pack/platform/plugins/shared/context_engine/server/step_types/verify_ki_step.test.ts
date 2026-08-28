/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createVerifyKiStepDefinition } from './verify_ki_step';
import { ESQL_VALID_RUNTIME_VERIFIER_ID, ESQL_VALID_SYNTAX_VERIFIER_ID } from '../ki_verification';

type VerifyKiHandler = ReturnType<typeof createVerifyKiStepDefinition>['handler'];
type VerifyKiHandlerContext = Parameters<VerifyKiHandler>[0];
type EsClientMock = ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

const makeHandlerContext = (
  ki: VerifyKiHandlerContext['input']['ki'],
  esClient: EsClientMock,
  { esqlAttributes, verifiers }: { esqlAttributes?: string[]; verifiers?: string[] } = {}
): VerifyKiHandlerContext =>
  ({
    input: { ki, esql_attributes: esqlAttributes, verifiers },
    config: {},
    rawInput: { ki, esql_attributes: esqlAttributes, verifiers },
    contextManager: {
      getFakeRequest: jest.fn(),
      getScopedEsClient: jest.fn().mockReturnValue(esClient),
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
  });

  const runHandler = async (
    ki: VerifyKiHandlerContext['input']['ki'],
    opts: { esqlAttributes?: string[]; verifiers?: string[] } = {}
  ) => {
    const definition = createVerifyKiStepDefinition(coreSetup, loggingSystemMock.createLogger());
    const { output } = await definition.handler(makeHandlerContext(ki, esClient, opts));
    if (!output) {
      throw new Error('step returned no output');
    }
    return output;
  };

  const ALL_ESQL_VERIFIERS = [ESQL_VALID_SYNTAX_VERIFIER_ID, ESQL_VALID_RUNTIME_VERIFIER_ID];

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
    ]);
  });

  it('verifies the attributes named in esql_attributes instead of the default', async () => {
    setContextEngineEnabled(true);

    const output = await runHandler(
      {
        attributes: {
          esql: 'FROM logs-* | EVAL x = NOT_A_FUNCTION(1)',
          aggregation_query: 'FROM logs-* | STATS c = COUNT(*)',
        },
      },
      { esqlAttributes: ['aggregation_query'], verifiers: ALL_ESQL_VERIFIERS }
    );

    expect(output.passed).toBe(true);
    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
  });

  it('passes a KI carrying none of the named attributes, without running any verifier', async () => {
    setContextEngineEnabled(true);

    const output = await runHandler(
      { attributes: { esql: 'FROM logs-* | LIMIT 1' } },
      { esqlAttributes: ['aggregation_query'], verifiers: ALL_ESQL_VERIFIERS }
    );

    expect(output).toEqual({ passed: true, results: [] });
    expect(esClient.esql.query).not.toHaveBeenCalled();
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
});
