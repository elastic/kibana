/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postEvaluation } from './evaluate';
import { HttpSetup } from '@kbn/core-http-browser';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';

jest.mock('@kbn/core-http-browser');

const mockHttp = {
  post: jest.fn(),
} as unknown as HttpSetup;

describe('postEvaluation', () => {
  it('calls the knowledge base API when correct resource path', async () => {
    (mockHttp.post as jest.Mock).mockResolvedValue({ success: true });
    const testProps = {
      http: mockHttp,
      evalParams: {
        agents: ['not', 'alphabetical'],
        dataset: '{}',
        datasetName: 'Test Dataset',
        projectName: 'Test Project Name',
        runName: 'Test Run Name',
        evalModel: ['not', 'alphabetical'],
        evalPrompt: 'evalPrompt',
        evaluationType: ['not', 'alphabetical'],
        models: ['not', 'alphabetical'],
        outputIndex: 'outputIndex',
      },
    };

    await postEvaluation(testProps);

    expect(mockHttp.post).toHaveBeenCalledWith('/internal/elastic_assistant/evaluate', {
      body: '{"dataset":{},"evalPrompt":"evalPrompt"}',
      headers: { 'Content-Type': 'application/json' },
      query: {
        models: 'alphabetical,not',
        agents: 'alphabetical,not',
        datasetName: 'Test Dataset',
        evaluationType: 'alphabetical,not',
        evalModel: 'alphabetical,not',
        outputIndex: 'outputIndex',
        projectName: 'Test Project Name',
        runName: 'Test Run Name',
      },
      signal: undefined,
      version: API_VERSIONS.internal.v1,
    });
  });
  it('returns error when error is an error', async () => {
    const error = 'simulated error';
    (mockHttp.post as jest.Mock).mockImplementation(() => {
      throw new Error(error);
    });

    const knowledgeBaseArgs = {
      resource: 'a-resource',
      http: mockHttp,
    };

    await expect(postEvaluation(knowledgeBaseArgs)).resolves.toThrowError('simulated error');
  });
});
