/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  createCaseRequestFixture,
  createCaseResponseFixture,
} from '../../common/fixtures/create_case';
import { createCaseStepDefinition } from './create_case';
import type { CasesClient } from '../client';

const createContext = (input: unknown): StepHandlerContext =>
  ({
    input,
    rawInput: input,
    config: {},
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue({} as KibanaRequest),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-step-id',
    stepType: 'cases.createCase',
  } as unknown as StepHandlerContext);

describe('createCaseStepDefinition', () => {
  const coreSetupMock = {} as Parameters<typeof createCaseStepDefinition>[0];

  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = createCaseStepDefinition(coreSetupMock, getCasesClient);

    expect(definition.id).toBe('cases.createCase');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(createCaseRequestFixture).success).toBe(true);
  });

  it('calls client.cases.create and wraps output.case on success', async () => {
    const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest
      .fn()
      .mockResolvedValue({ cases: { create } } as unknown as CasesClient);
    const definition = createCaseStepDefinition(coreSetupMock, getCasesClient);
    const context = createContext(createCaseRequestFixture);

    const result = await definition.handler(context);

    expect(getCasesClient).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(createCaseRequestFixture);
    expect(result).toEqual({
      output: {
        case: createCaseResponseFixture,
      },
    });
  });

  it('returns error when client.cases.create throws', async () => {
    const createError = new Error('create failed');
    const create = jest.fn().mockRejectedValue(createError);
    const getCasesClient = jest
      .fn()
      .mockResolvedValue({ cases: { create } } as unknown as CasesClient);
    const definition = createCaseStepDefinition(coreSetupMock, getCasesClient);

    const result = await definition.handler(createContext(createCaseRequestFixture));

    expect(result).toEqual({ error: createError });
  });
});
