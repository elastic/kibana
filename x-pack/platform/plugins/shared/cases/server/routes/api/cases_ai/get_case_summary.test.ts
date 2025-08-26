/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCaseSummaryRoute } from './get_case_summary';
import { MessageRole } from '@kbn/inference-common';

describe('getCaseSummaryRoute', () => {
  const casesClientMock = {
    cases: {
      get: jest.fn().mockResolvedValue({
        id: 'test-case',
        title: 'Test case',
        comments: [],
      }),
    },
  };
  const inferenceClientMock = {
    chatComplete: jest.fn().mockResolvedValue({
      content: 'This is a case summary.',
    }),
  };
  const response = { ok: jest.fn() };
  const context = {
    cases: {
      getCasesClient: jest.fn().mockResolvedValue(casesClientMock),
      getInferenceClient: jest.fn().mockResolvedValue(inferenceClientMock),
    },
  };

  afterEach(() => jest.clearAllMocks());

  it('returns summary content and generatedAt when chat completes', async () => {
    const request = {
      params: { case_id: 'test-case' },
      query: { connectorId: 'test-connector' },
    };

    // @ts-ignore
    await getCaseSummaryRoute.handler({ context, request, response });

    expect(casesClientMock.cases.get).toHaveBeenCalledWith({
      id: 'test-case',
      includeComments: true,
    });
    expect(inferenceClientMock.chatComplete).toHaveBeenCalledWith({
      connectorId: 'test-connector',
      messages: [
        {
          role: MessageRole.User,
          content: expect.any(String),
        },
      ],
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        content: 'This is a case summary.',
        generatedAt: expect.any(String),
      },
    });
  });

  it('throws error if inference client is not available', async () => {
    const contextWithoutInferenceClient = {
      cases: {
        getCasesClient: jest.fn().mockResolvedValue(casesClientMock),
        getInferenceClient: jest.fn().mockResolvedValue(undefined),
      },
    };
    const request = {
      params: { case_id: 'test-case' },
      query: { connectorId: 'test-connector' },
    };

    await expect(
      // @ts-ignore
      getCaseSummaryRoute.handler({ context: contextWithoutInferenceClient, request, response })
    ).rejects.toThrow('Failed to generate case summary: Error: Inference client is not available');
  });

  it('throws error if chatComplete fails', async () => {
    inferenceClientMock.chatComplete.mockRejectedValueOnce(new Error('Inference error'));
    const request = {
      params: { case_id: 'test-case' },
      query: { connectorId: 'test-connector' },
    };

    // @ts-ignore
    await expect(getCaseSummaryRoute.handler({ context, request, response })).rejects.toThrow(
      'Failed to generate case summary: Error: Inference error'
    );
  });
});
