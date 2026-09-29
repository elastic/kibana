/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { lastValueFrom } from 'rxjs';
import { InferenceConnectorType } from '@kbn/inference-common';
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { FunctionRegistrationParameters } from '..';
import { registerContextFunction } from './context';
import { recallAndScore } from './utils/recall_and_score';

vi.mock('./utils/recall_and_score', () => {
      const mocked = {
      recallAndScore: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const recallAndScoreMock = recallAndScore as MockedFunction<typeof recallAndScore>;

describe('registerContextFunction connector resolution', () => {
  const inferenceEndpointId = 'elastic-llm';
  const getConnectorById = vi.fn();
  const request = httpServerMock.createKibanaRequest();
  const logger = loggerMock.create();

  const inferenceConnector = {
    connectorId: inferenceEndpointId,
    name: inferenceEndpointId,
    type: InferenceConnectorType.Inference,
    config: { inferenceId: inferenceEndpointId },
    isInferenceEndpoint: true,
    isPreconfigured: true,
    isEis: true,
    capabilities: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getConnectorById.mockResolvedValue(inferenceConnector);
    recallAndScoreMock.mockResolvedValue({
      suggestions: [],
      relevantDocuments: [],
      llmScores: [],
    });
  });

  function registerAndGetHandler(isKnowledgeBaseReady = true) {
    const functions = { registerFunction: vi.fn() };
    registerContextFunction({
      client: { recall: vi.fn() },
      functions,
      resources: {
        request,
        logger,
        plugins: {
          core: {
            start: vi.fn().mockResolvedValue({
              analytics: { reportEvent: vi.fn() },
            }),
          },
          inference: {
            start: vi.fn().mockResolvedValue({ getConnectorById }),
          },
        },
      },
      scopes: ['observability'],
      isKnowledgeBaseReady,
    } as unknown as FunctionRegistrationParameters & { isKnowledgeBaseReady: boolean });

    return functions.registerFunction.mock.calls[0][1];
  }

  it('resolves inference endpoint IDs via inference.getConnectorById', async () => {
    const handler = registerAndGetHandler();

    const response$ = await handler({
      connectorId: inferenceEndpointId,
      messages: [],
      screenContexts: [{ screenDescription: 'User is viewing a service map.' }],
      chat: vi.fn(),
      signal: new AbortController().signal,
    });

    await lastValueFrom(response$);

    expect(getConnectorById).toHaveBeenCalledWith(inferenceEndpointId, request);
    expect(recallAndScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connector: inferenceConnector,
      })
    );
  });
});
