/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { DocSearchResult } from '@kbn/product-doc-base-plugin/server/services/search';

import { retrieveDocumentation } from './retrieve_documentation';
import { truncate, count as countTokens } from '../../utils/tokens';
jest.mock('../../utils/tokens');
const truncateMock = truncate as jest.MockedFn<typeof truncate>;
const countTokensMock = countTokens as jest.MockedFn<typeof countTokens>;

import { summarizeDocument } from './summarize_document';
jest.mock('./summarize_document');
const summarizeDocumentMock = summarizeDocument as jest.MockedFn<typeof summarizeDocument>;

describe('retrieveDocumentation', () => {
  let logger: MockedLogger;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let outputAPI: jest.Mock;
  let searchDocAPI: jest.Mock;
  let retrieve: ReturnType<typeof retrieveDocumentation>;

  const createResult = (parts: Partial<DocSearchResult> = {}): DocSearchResult => {
    return {
      title: 'title',
      content: 'content',
      url: 'url',
      productName: 'kibana',
      ...parts,
    };
  };

  beforeEach(() => {
    logger = loggerMock.create();
    request = httpServerMock.createKibanaRequest();
    outputAPI = jest.fn();
    searchDocAPI = jest.fn();
    retrieve = retrieveDocumentation({ logger, searchDocAPI, outputAPI });
  });

  afterEach(() => {
    summarizeDocumentMock.mockReset();
    truncateMock.mockReset();
    countTokensMock.mockReset();
  });

  it('calls the search API with the right parameters', async () => {
    searchDocAPI.mockResolvedValue({ results: [] });

    const result = await retrieve({
      searchTerm: 'What is Kibana?',
      products: ['kibana'],
      request,
      max: 5,
      connectorId: '.my-connector',
      functionCalling: 'simulated',
    });

    expect(result).toEqual({
      success: true,
      documents: [],
    });

    expect(searchDocAPI).toHaveBeenCalledTimes(1);
    expect(searchDocAPI).toHaveBeenCalledWith({
      query: 'What is Kibana?',
      products: ['kibana'],
      max: 5,
    });
  });

  it('reduces the document length using the truncate strategy', async () => {
    searchDocAPI.mockResolvedValue({
      results: [
        createResult({ content: 'content-1' }),
        createResult({ content: 'content-2' }),
        createResult({ content: 'content-3' }),
      ],
    });

    countTokensMock.mockImplementation((text) => {
      if (text === 'content-2') {
        return 150;
      } else {
        return 50;
      }
    });
    truncateMock.mockReturnValue('truncated');

    const result = await retrieve({
      searchTerm: 'What is Kibana?',
      request,
      connectorId: '.my-connector',
      maxDocumentTokens: 100,
      tokenReductionStrategy: 'truncate',
    });

    expect(result.documents.length).toEqual(3);
    expect(result.documents[0].content).toEqual('content-1');
    expect(result.documents[1].content).toEqual('truncated');
    expect(result.documents[2].content).toEqual('content-3');

    expect(truncateMock).toHaveBeenCalledTimes(1);
    expect(truncateMock).toHaveBeenCalledWith('content-2', 100);
  });

  it('reduces the document length using the summarize strategy', async () => {
    searchDocAPI.mockResolvedValue({
      results: [
        createResult({ content: 'content-1' }),
        createResult({ content: 'content-2' }),
        createResult({ content: 'content-3' }),
      ],
    });

    countTokensMock.mockImplementation((text) => {
      if (text === 'content-2') {
        return 50;
      } else {
        return 150;
      }
    });
    truncateMock.mockImplementation((text) => text);

    summarizeDocumentMock.mockImplementation(({ documentContent }) => {
      return Promise.resolve({ summary: `${documentContent}-summarized` });
    });

    const result = await retrieve({
      searchTerm: 'What is Kibana?',
      request,
      connectorId: '.my-connector',
      maxDocumentTokens: 100,
      tokenReductionStrategy: 'summarize',
    });

    expect(result.documents.length).toEqual(3);
    expect(result.documents[0].content).toEqual('content-1-summarized');
    expect(result.documents[1].content).toEqual('content-2');
    expect(result.documents[2].content).toEqual('content-3-summarized');

    expect(truncateMock).toHaveBeenCalledTimes(2);
    expect(truncateMock).toHaveBeenCalledWith('content-1-summarized', 100);
    expect(truncateMock).toHaveBeenCalledWith('content-3-summarized', 100);
  });

  it('logs an error and return an empty list of docs in case of error', async () => {
    searchDocAPI.mockResolvedValue({
      results: [createResult({ content: 'content-1' })],
    });
    countTokensMock.mockImplementation(() => {
      return 150;
    });
    summarizeDocumentMock.mockImplementation(() => {
      throw new Error('woups');
    });

    const result = await retrieve({
      searchTerm: 'What is Kibana?',
      request,
      connectorId: '.my-connector',
      maxDocumentTokens: 100,
      tokenReductionStrategy: 'summarize',
    });

    expect(result).toEqual({
      success: false,
      documents: [],
    });

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error retrieving documentation')
    );
  });
});
