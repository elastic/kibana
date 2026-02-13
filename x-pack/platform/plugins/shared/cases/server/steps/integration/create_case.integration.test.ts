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
} from '../../../common/fixtures/create_case';
import { createCaseStepDefinition } from '../create_case';
import type { CasesClient } from '../../client';

const createHandlerContext = (input: unknown): StepHandlerContext =>
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
    stepId: 'step-create-case',
    stepType: 'cases.createCase',
  } as unknown as StepHandlerContext);

describe('create_case workflow integration', () => {
  const coreSetupMock = {} as Parameters<typeof createCaseStepDefinition>[0];

  it('validates workflow input and returns output matching the output schema', async () => {
    const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest
      .fn()
      .mockResolvedValue({ cases: { create } } as unknown as CasesClient);
    const stepDefinition = createCaseStepDefinition(coreSetupMock, getCasesClient);
    const context = createHandlerContext(createCaseRequestFixture);

    expect(stepDefinition.inputSchema.safeParse(context.input).success).toBe(true);

    const result = await stepDefinition.handler(context);

    expect(result).toEqual({
      output: {
        case: createCaseResponseFixture,
      },
    });
    expect(stepDefinition.outputSchema.safeParse(result.output).success).toBe(true);
  });
});
