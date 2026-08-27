/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createVerifyKiStepDefinition } from './verify_ki_step';
import { ESQL_VALID_SYNTAX_VERIFIER_ID } from '../ki_verification';

type VerifyKiHandler = ReturnType<typeof createVerifyKiStepDefinition>['handler'];
type VerifyKiHandlerContext = Parameters<VerifyKiHandler>[0];

const makeHandlerContext = (ki: VerifyKiHandlerContext['input']['ki']): VerifyKiHandlerContext =>
  ({
    input: { ki },
    config: {},
    rawInput: { ki },
    contextManager: { getFakeRequest: jest.fn(), getScopedEsClient: jest.fn() },
    logger: loggingSystemMock.createLogger(),
    abortSignal: new AbortController().signal,
    stepId: 'verify_ki',
    stepType: 'context-engine.verifyKi',
  } as unknown as VerifyKiHandlerContext);

describe('verify_ki workflow step', () => {
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let uiSettingsGet: jest.Mock;

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
  });

  const runHandler = async (ki: VerifyKiHandlerContext['input']['ki']) => {
    const definition = createVerifyKiStepDefinition(coreSetup, loggingSystemMock.createLogger());
    const { output } = await definition.handler(makeHandlerContext(ki));
    if (!output) {
      throw new Error('step returned no output');
    }
    return output;
  };

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
});
