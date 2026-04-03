/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';

interface CreateStepHandlerContextParams {
  input?: unknown;
  config?: Record<string, unknown>;
  stepType?: string;
  esSearchMock?: jest.Mock;
  esCountMock?: jest.Mock;
  overrides?: Partial<StepHandlerContext>;
}

export const createStepHandlerContext = ({
  input = {},
  config = {},
  stepType = 'osquery.test',
  esSearchMock = jest.fn(),
  esCountMock = jest.fn(),
  overrides = {},
}: CreateStepHandlerContextParams = {}): StepHandlerContext => {
  const context = {
    input,
    rawInput: input,
    config,
    contextManager: {
      getContext: jest.fn().mockReturnValue({
        workflow: { spaceId: 'default' },
      }),
      getScopedEsClient: jest.fn().mockReturnValue({
        search: esSearchMock,
        count: esCountMock,
      }),
      getFakeRequest: jest.fn().mockReturnValue({} as KibanaRequest),
      renderInputTemplate: jest.fn((v: unknown) => v),
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

export const createMockActionService = () => ({
  create: jest.fn(),
  stop: jest.fn(),
  logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
});
