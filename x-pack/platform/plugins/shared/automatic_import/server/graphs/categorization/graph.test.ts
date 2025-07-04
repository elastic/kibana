/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { FakeLLM } from '@langchain/core/utils/testing';
import { getCategorizationGraph } from './graph';
import {
  categorizationExpectedResults,
  categorizationErrorMockedResponse,
  categorizationInitialMockedResponse,
  categorizationInvalidMockedResponse,
  categorizationReviewMockedResponse,
  categorizationInitialPipeline,
  testPipelineError,
  testPipelineValidResult,
  testPipelineInvalidEcs,
} from '../../../__jest__/fixtures/categorization';
import type { SimplifiedProcessors } from '../../types';
import { mockedRequestWithPipeline } from '../../../__jest__/fixtures';
import { handleReview } from './review';
import { handleCategorization } from './categorization';
import { handleErrors } from './errors';
import { handleInvalidCategorization } from './invalid';
import { handleUpdateStableSamples } from './stable';
import { testPipeline, combineProcessors } from '../../util';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import { handleValidatePipeline } from '../../util/graph';

const model = new FakeLLM({
  response: "I'll callback later.",
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

jest.mock('./errors');
jest.mock('./review');
jest.mock('./categorization');
jest.mock('./invalid');
jest.mock('./stable');
jest.mock('../../util/graph');

jest.mock('../../util/pipeline', () => ({
  testPipeline: jest.fn(),
}));

describe('runCategorizationGraph', () => {
  const client = {
    asCurrentUser: {
      ingest: {
        simulate: jest.fn(),
      },
    },
  } as unknown as IScopedClusterClient;
  beforeEach(() => {
    // Mocked responses for each node that requires an LLM API call/response.
    const mockInvokeCategorization = jest
      .fn()
      .mockResolvedValue(categorizationInitialMockedResponse);
    const mockInvokeError = jest.fn().mockResolvedValue(categorizationErrorMockedResponse);
    const mockInvokeInvalid = jest.fn().mockResolvedValue(categorizationInvalidMockedResponse);
    const mockInvokeReview = jest.fn().mockResolvedValue(categorizationReviewMockedResponse);

    // We do not care about ES in these tests, the mock is just to prevent errors.

    // After this is triggered, the mock of TestPipeline will trigger the expected error, to route to error handler
    (handleValidatePipeline as jest.Mock)
      .mockResolvedValueOnce({
        previousPipelineResults: [],
        pipelineResults: [{ event: { type: ['creation'], category: ['database'] } }],
        lastExecutedChain: 'validate_pipeline',
      })
      .mockResolvedValueOnce({
        previousPipelineResults: [],
        errors: [{ error: 'Sample error message 1' }],
        pipelineResults: [{ event: { type: ['change'], category: ['database'] } }],
        lastExecutedChain: 'validate_pipeline',
      })
      .mockResolvedValueOnce({
        previousPipelineResults: [],
        errors: [],
        pipelineResults: [{ event: { type: ['change'], category: ['database'] } }],
        lastExecutedChain: 'validate_pipeline',
      })
      .mockResolvedValueOnce({
        previousPipelineResults: [],
        pipelineResults: [{ event: { type: ['change'], category: ['database'] } }],
        lastExecutedChain: 'validate_pipeline',
      })
      .mockResolvedValueOnce({
        previousPipelineResults: [],
        pipelineResults: [{ event: { type: ['change'], category: ['database'] } }],
        lastExecutedChain: 'validate_pipeline',
      })
      .mockResolvedValueOnce({
        previousPipelineResults: [],
        pipelineResults: [{ event: { type: ['change'], category: ['database'] } }],
        lastExecutedChain: 'validate_pipeline',
      });
    (handleCategorization as jest.Mock).mockImplementation(async () => {
      const currentProcessors = await mockInvokeCategorization();
      const processors = {
        type: 'categorization',
        processors: currentProcessors,
      } as SimplifiedProcessors;
      const currentPipeline = combineProcessors(categorizationInitialPipeline, processors);
      return {
        currentPipeline,
        currentProcessors,
        stableSamples: [],
        reviewCount: 0,
        finalized: false,
        lastExecutedChain: 'categorization',
      };
    });
    // Error pipeline resolves it, though the responce includes an invalid categorization
    (handleErrors as jest.Mock).mockImplementation(async () => {
      const currentProcessors = await mockInvokeError();
      const processors = {
        type: 'categorization',
        processors: currentProcessors,
      } as SimplifiedProcessors;
      const currentPipeline = combineProcessors(categorizationInitialPipeline, processors);
      return {
        currentPipeline,
        currentProcessors,
        stableSamples: [],
        reviewCount: 0,
        finalized: false,
        lastExecutedChain: 'error',
      };
    });
    // Invalid categorization is resolved and returned correctly, which routes it to a review
    (handleInvalidCategorization as jest.Mock).mockImplementation(async () => {
      const currentProcessors = await mockInvokeInvalid();
      const processors = {
        type: 'categorization',
        processors: currentProcessors,
      } as SimplifiedProcessors;
      const currentPipeline = combineProcessors(categorizationInitialPipeline, processors);
      return {
        currentPipeline,
        currentProcessors,
        stableSamples: [],
        reviewCount: 0,
        finalized: false,
        lastExecutedChain: 'invalidCategorization',
      };
    });
    // After the review it should route to modelOutput and finish.
    (handleReview as jest.Mock).mockImplementation(async () => {
      const currentProcessors = await mockInvokeReview();
      const processors = {
        type: 'categorization',
        processors: currentProcessors,
      } as SimplifiedProcessors;
      const currentPipeline = combineProcessors(categorizationInitialPipeline, processors);
      return {
        currentProcessors,
        currentPipeline,
        stableSamples: [],
        reviewCount: 0,
        finalized: false,
        lastExecutedChain: 'review',
      };
    });
    // After the review it should route to modelOutput and finish.
    (handleUpdateStableSamples as jest.Mock)
      .mockResolvedValueOnce({
        stableSamples: [],
        finalized: false,
        lastExecutedChain: 'handleUpdateStableSamples',
      })
      .mockResolvedValueOnce({
        stableSamples: [],
        finalized: false,
        lastExecutedChain: 'handleUpdateStableSamples',
      })
      .mockResolvedValueOnce({
        stableSamples: [],
        finalized: false,
        lastExecutedChain: 'handleUpdateStableSamples',
      })
      .mockResolvedValueOnce({
        stableSamples: [0],
        finalized: false,
        lastExecutedChain: 'handleUpdateStableSamples',
      });
  });

  it('Ensures that the graph compiles', async () => {
    try {
      await getCategorizationGraph({ client, model });
    } catch (error) {
      throw Error(`getCategorizationGraph threw an error: ${error}`);
    }
  });

  it('Runs the whole graph, with mocked outputs from the LLM.', async () => {
    const categorizationGraph = await getCategorizationGraph({ client, model });

    (testPipeline as jest.Mock)
      .mockResolvedValueOnce(testPipelineValidResult)
      .mockResolvedValueOnce(testPipelineError)
      .mockResolvedValueOnce(testPipelineInvalidEcs)
      .mockResolvedValueOnce(testPipelineValidResult)
      .mockResolvedValueOnce(testPipelineValidResult)
      .mockResolvedValueOnce(testPipelineValidResult);

    let response;
    try {
      response = await categorizationGraph.invoke(mockedRequestWithPipeline);
    } catch (error) {
      throw Error(`getCategorizationGraph threw an error: ${error}`);
    }

    // Check if the functions were called
    expect(handleValidatePipeline).toHaveBeenCalled();
    expect(handleCategorization).toHaveBeenCalled();
    expect(handleErrors).toHaveBeenCalled();
    expect(handleInvalidCategorization).toHaveBeenCalled();
    expect(handleReview).toHaveBeenCalled();

    expect(response.results).toStrictEqual(categorizationExpectedResults);
  });
});
