/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FakeLLM } from '@langchain/core/utils/testing';
import { getApiAnalysisGraph } from './graph';
import {
  apiAnalysisPathSuggestionsMockedResponse,
  apiAnalysisExpectedResults,
} from '../../../__jest__/fixtures/api_analysis';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import { mockedApiAnalysisRequest } from '../../../__jest__/fixtures';
import { handleGetSuggestedPaths } from './paths';

const model = new FakeLLM({
  response: "I'll callback later.",
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

jest.mock('./paths');

describe('CelGraph', () => {
  beforeEach(() => {
    // Mocked responses for each node that requires an LLM API call/response.
    const mockInvokePathSuggestions = jest
      .fn()
      .mockResolvedValue(apiAnalysisPathSuggestionsMockedResponse);

    (handleGetSuggestedPaths as jest.Mock).mockImplementation(async () => ({
      suggestedPaths: await mockInvokePathSuggestions(),
      lastExecutedChain: 'getSuggestedPaths',
    }));
  });

  it('Ensures that the graph compiles', async () => {
    // When getCelGraph runs, langgraph compiles the graph it will error if the graph has any issues.
    // Common issues for example detecting a node has no next step, or there is a infinite loop between them.
    try {
      await getApiAnalysisGraph({ model });
    } catch (error) {
      throw Error(`getCelGraph threw an error: ${error}`);
    }
  });

  it('Runs the whole graph, with mocked outputs from the LLM.', async () => {
    const celGraph = await getApiAnalysisGraph({ model });
    let response;
    try {
      response = await celGraph.invoke(mockedApiAnalysisRequest);
    } catch (error) {
      throw Error(`getCelGraph threw an error: ${error}`);
    }

    expect(handleGetSuggestedPaths).toHaveBeenCalled();
    expect(response.results).toStrictEqual(apiAnalysisExpectedResults);
  });
});
