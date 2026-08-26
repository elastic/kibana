/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import type { AiIndexService } from '../ai_indices/service';

/** Builds a minimal step handler context with a mocked scoped ES client. */
export const createMockStepContext = ({
  input,
  esClient,
}: {
  input: unknown;
  esClient: unknown;
}): StepHandlerContext => {
  const abortController = new AbortController();
  return {
    input,
    rawInput: {},
    config: {},
    contextManager: {
      getScopedEsClient: jest.fn().mockReturnValue(esClient),
      getFakeRequest: jest.fn().mockReturnValue({ headers: {} }),
      getContext: jest.fn(),
      renderInputTemplate: jest.fn(),
    },
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: abortController.signal,
    stepId: 'test-step',
    stepType: 'context-engine.test',
  } as unknown as StepHandlerContext;
};

/** An AiIndexService stub whose `get` resolves to an AI index with the given dest. */
export const mockAiIndexService = (dest: AiIndexDest): AiIndexService =>
  ({
    get: jest.fn().mockResolvedValue({ id: 'my-ai-index', dest }),
  } as unknown as AiIndexService);
