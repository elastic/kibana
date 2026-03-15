/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { CasesClient } from '../../client';

interface CreateStepHandlerContextParams {
  input?: unknown;
  config?: Record<string, unknown>;
  stepType?: string;
  overrides?: Partial<StepHandlerContext>;
}

export const createStepHandlerContext = ({
  input = {},
  config = {},
  stepType = 'cases.custom',
  overrides = {},
}: CreateStepHandlerContextParams = {}): StepHandlerContext => {
  const context = {
    input,
    rawInput: input,
    config,
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
    stepType,
  } as unknown as StepHandlerContext;

  return {
    ...context,
    ...overrides,
  };
};

export const createBulkUpdateCasesClientMock = <TCase extends object>(updatedCase: TCase) => {
  const get = jest.fn();
  const bulkUpdate = jest.fn().mockResolvedValue([updatedCase]);
  const getCasesClient = jest.fn().mockResolvedValue({
    cases: { get, bulkUpdate },
  } as unknown as CasesClient);

  return { get, bulkUpdate, getCasesClient };
};
