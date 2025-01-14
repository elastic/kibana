/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postEvaluation } from './evaluate';
import { HttpSetup } from '@kbn/core-http-browser';
import { API_VERSIONS, PostEvaluateRequestBodyInput } from '@kbn/elastic-assistant-common';

jest.mock('@kbn/core-http-browser');

const mockHttp = {
  post: jest.fn(),
} as unknown as HttpSetup;

describe('postEvaluation', () => {
  const evalParams: PostEvaluateRequestBodyInput = {
    graphs: ['not', 'alphabetical'],
    datasetName: 'Test Dataset',
    runName: 'Test Run Name',
    connectorIds: ['not', 'alphabetical'],
  };

  it('calls the evaluate API when correct resource path', async () => {
    (mockHttp.post as jest.Mock).mockResolvedValue({ success: true });

    const testProps = {
      http: mockHttp,
      evalParams,
    };

    await postEvaluation(testProps);

    expect(mockHttp.post).toHaveBeenCalledWith('/internal/elastic_assistant/evaluate', {
      body: '{"graphs":["not","alphabetical"],"datasetName":"Test Dataset","runName":"Test Run Name","connectorIds":["not","alphabetical"]}',
      headers: { 'Content-Type': 'application/json' },
      signal: undefined,
      version: API_VERSIONS.internal.v1,
    });
  });
  it('returns error when error is an error', async () => {
    const error = 'simulated error';
    (mockHttp.post as jest.Mock).mockImplementation(() => {
      throw new Error(error);
    });

    const evaluationArgs = {
      resource: 'a-resource',
      http: mockHttp,
      evalParams,
    };

    await expect(postEvaluation(evaluationArgs)).rejects.toThrowError('simulated error');
  });
});
