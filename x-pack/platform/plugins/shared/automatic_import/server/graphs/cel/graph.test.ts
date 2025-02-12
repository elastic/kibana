/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { getCelGraph } from './graph';
import {
  celProgramMock,
  celQuerySummaryMockedResponse,
  celStateVarsMockedResponse,
  celExpectedResults,
  celStateSettings,
  celRedact,
  celConfigFields,
} from '../../../__jest__/fixtures/cel';
import { mockedRequestWithCelDetails } from '../../../__jest__/fixtures';
import { handleSummarizeQuery } from './summarize_query';
import { handleBuildProgram } from './build_program';
import { handleUpdateProgramHeaderAuth } from './auth_header';
import { handleAnalyzeHeaders } from './analyze_headers';
import { handleUpdateProgramBasic } from './auth_basic';
import { handleRemoveHeadersDigest } from './auth_digest';
import { handleUpdateProgramOauth2 } from './auth_oauth2';
import { handleGetStateVariables } from './retrieve_state_vars';
import { handleGetStateDetails } from './retrieve_state_details';

import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';

const model = new FakeLLM({
  response: "I'll callback later.",
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

jest.mock('./summarize_query');
jest.mock('./build_program');
jest.mock('./auth_header');
jest.mock('./analyze_headers');
jest.mock('./auth_basic');
jest.mock('./auth_digest');
jest.mock('./auth_oauth2');
jest.mock('./retrieve_state_vars');
jest.mock('./retrieve_state_details');

describe('CelGraph', () => {
  beforeEach(() => {
    // Mocked responses for each node that requires an LLM API call/response.
    const mockInvokeCelSummarizeQuery = jest.fn().mockResolvedValue(celQuerySummaryMockedResponse);
    const mockInvokeCelProgram = jest.fn().mockResolvedValue(celProgramMock);
    const mockInvokeCelStateVars = jest.fn().mockResolvedValue(celStateVarsMockedResponse);
    const mockInvokeCelStateSettings = jest.fn().mockResolvedValue(celStateSettings);
    const mockInvokeCelConfigFields = jest.fn().mockResolvedValue(celConfigFields);
    const mockInvokeCelRedactVars = jest.fn().mockResolvedValue(celRedact);

    // Returns the initial query summary for the api, to trigger the next step.
    (handleSummarizeQuery as jest.Mock).mockImplementation(async () => ({
      apiQuerySummary: await mockInvokeCelSummarizeQuery(),
      lastExecutedChain: 'summarizeQuery',
    }));

    // Returns the CEL program, to trigger the next step.
    (handleBuildProgram as jest.Mock).mockImplementation(async () => ({
      currentProgram: await mockInvokeCelProgram(),
      lastExecutedChain: 'buildProgram',
    }));

    // Returns the state variable names for the CEL program, to trigger the next step.
    (handleGetStateVariables as jest.Mock).mockImplementation(async () => ({
      stateVarNames: await mockInvokeCelStateVars(),
      lastExecutedChain: 'getStateVars',
    }));

    // Returns the state details for the CEL program.
    (handleGetStateDetails as jest.Mock).mockImplementation(async () => ({
      stateSettings: await mockInvokeCelStateSettings(),
      configFields: await mockInvokeCelConfigFields(),
      redactVars: await mockInvokeCelRedactVars(),
      lastExecutedChain: 'getStateDetails',
    }));
  });

  it('Ensures that the graph compiles', async () => {
    // When getCelGraph runs, langgraph compiles the graph it will error if the graph has any issues.
    // Common issues for example detecting a node has no next step, or there is a infinite loop between them.
    try {
      await getCelGraph({ model });
    } catch (error) {
      throw Error(`getCelGraph threw an error: ${error}`);
    }
  });

  describe('Runs the whole graph, with mocked outputs from the LLM.', () => {
    it('header auth', async () => {
      const celGraph = await getCelGraph({ model });
      let response;
      try {
        const mockRequest = { ...mockedRequestWithCelDetails, authType: 'header' };
        response = await celGraph.invoke(mockRequest);
      } catch (error) {
        throw Error(`getCelGraph threw an error: ${error}`);
      }

      expect(handleSummarizeQuery).toHaveBeenCalled();
      expect(handleBuildProgram).toHaveBeenCalled();
      expect(handleUpdateProgramHeaderAuth).toHaveBeenCalled();
      expect(handleGetStateVariables).toHaveBeenCalled();
      expect(handleGetStateDetails).toHaveBeenCalled();

      expect(response.results).toStrictEqual(celExpectedResults);
    });

    describe('program with headers', () => {
      beforeEach(() => {
        const mockInvokeAnalyzeHeaders = jest.fn().mockResolvedValue(true);
        (handleAnalyzeHeaders as jest.Mock).mockImplementation(async () => ({
          hasProgramHeaders: await mockInvokeAnalyzeHeaders(),
          lastExecutedChain: 'analyzeProgramHeaders',
        }));
      });

      it('basic auth', async () => {
        const celGraph = await getCelGraph({ model });
        let response;
        try {
          const mockRequest = { ...mockedRequestWithCelDetails, authType: 'basic' };
          response = await celGraph.invoke(mockRequest);
        } catch (error) {
          throw Error(`getCelGraph threw an error: ${error}`);
        }

        expect(handleSummarizeQuery).toHaveBeenCalled();
        expect(handleBuildProgram).toHaveBeenCalled();
        expect(handleAnalyzeHeaders).toHaveBeenCalled();
        expect(handleUpdateProgramBasic).toHaveBeenCalled();
        expect(handleGetStateVariables).toHaveBeenCalled();
        expect(handleGetStateDetails).toHaveBeenCalled();

        expect(response.results).toStrictEqual(celExpectedResults);
      });

      it('digest auth', async () => {
        const celGraph = await getCelGraph({ model });
        let response;
        try {
          const mockRequest = { ...mockedRequestWithCelDetails, authType: 'digest' };
          response = await celGraph.invoke(mockRequest);
        } catch (error) {
          throw Error(`getCelGraph threw an error: ${error}`);
        }

        expect(handleSummarizeQuery).toHaveBeenCalled();
        expect(handleBuildProgram).toHaveBeenCalled();
        expect(handleAnalyzeHeaders).toHaveBeenCalled();
        expect(handleRemoveHeadersDigest).toHaveBeenCalled();
        expect(handleGetStateVariables).toHaveBeenCalled();
        expect(handleGetStateDetails).toHaveBeenCalled();

        expect(response.results).toStrictEqual(celExpectedResults);
      });

      it('oauth', async () => {
        const celGraph = await getCelGraph({ model });
        let response;
        try {
          const mockRequest = { ...mockedRequestWithCelDetails, authType: 'oauth2' };
          response = await celGraph.invoke(mockRequest);
        } catch (error) {
          throw Error(`getCelGraph threw an error: ${error}`);
        }

        expect(handleSummarizeQuery).toHaveBeenCalled();
        expect(handleBuildProgram).toHaveBeenCalled();
        expect(handleAnalyzeHeaders).toHaveBeenCalled();
        expect(handleUpdateProgramOauth2).toHaveBeenCalled();
        expect(handleGetStateVariables).toHaveBeenCalled();
        expect(handleGetStateDetails).toHaveBeenCalled();

        expect(response.results).toStrictEqual(celExpectedResults);
      });
    });
  });
});

describe('program without headers', () => {
  beforeEach(() => {
    const mockInvokeAnalyzeHeaders = jest.fn().mockResolvedValue(false);
    (handleAnalyzeHeaders as jest.Mock).mockImplementation(async () => ({
      hasProgramHeaders: await mockInvokeAnalyzeHeaders(),
      lastExecutedChain: 'analyzeProgramHeaders',
    }));
  });
  it('basic auth', async () => {
    const celGraph = await getCelGraph({ model });
    let response;
    try {
      const mockRequest = { ...mockedRequestWithCelDetails, authType: 'basic' };
      response = await celGraph.invoke(mockRequest);
    } catch (error) {
      throw Error(`getCelGraph threw an error: ${error}`);
    }

    expect(handleSummarizeQuery).toHaveBeenCalled();
    expect(handleBuildProgram).toHaveBeenCalled();
    expect(handleAnalyzeHeaders).toHaveBeenCalled();
    expect(handleUpdateProgramBasic).toHaveBeenCalled();
    expect(handleGetStateVariables).toHaveBeenCalled();
    expect(handleGetStateDetails).toHaveBeenCalled();

    const expected = { ...celExpectedResults, needsAuthConfigBlock: true };

    expect(response.results).toStrictEqual(expected);
  });

  it('digest auth', async () => {
    const celGraph = await getCelGraph({ model });
    let response;
    try {
      const mockRequest = { ...mockedRequestWithCelDetails, authType: 'digest' };
      response = await celGraph.invoke(mockRequest);
    } catch (error) {
      throw Error(`getCelGraph threw an error: ${error}`);
    }

    expect(handleSummarizeQuery).toHaveBeenCalled();
    expect(handleBuildProgram).toHaveBeenCalled();
    expect(handleAnalyzeHeaders).toHaveBeenCalled();
    expect(handleRemoveHeadersDigest).toHaveBeenCalled();
    expect(handleGetStateVariables).toHaveBeenCalled();
    expect(handleGetStateDetails).toHaveBeenCalled();

    const expected = { ...celExpectedResults, needsAuthConfigBlock: true };

    expect(response.results).toStrictEqual(expected);
  });

  it('oauth', async () => {
    const celGraph = await getCelGraph({ model });
    let response;
    try {
      const mockRequest = { ...mockedRequestWithCelDetails, authType: 'oauth2' };
      response = await celGraph.invoke(mockRequest);
    } catch (error) {
      throw Error(`getCelGraph threw an error: ${error}`);
    }

    expect(handleSummarizeQuery).toHaveBeenCalled();
    expect(handleBuildProgram).toHaveBeenCalled();
    expect(handleAnalyzeHeaders).toHaveBeenCalled();
    expect(handleUpdateProgramOauth2).toHaveBeenCalled();
    expect(handleGetStateVariables).toHaveBeenCalled();
    expect(handleGetStateDetails).toHaveBeenCalled();

    const expected = { ...celExpectedResults, needsAuthConfigBlock: true };

    expect(response.results).toStrictEqual(expected);
  });
});
