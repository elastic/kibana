/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverMock } from '../__mocks__/mock_server';
import { requestMock } from '../__mocks__/request';
import { requestContextMock } from '../__mocks__/request_context';
import { CHECK_PIPELINE_PATH } from '../../common';
import { registerPipelineRoutes } from './pipeline_routes';

const errors: object[] = [];

const pipelineResults = [
  {
    script: {
      source: {},
    },
  },
];

jest.mock('../util/pipeline', () => {
  return {
    testPipeline: jest.fn().mockReturnValue({ errors, pipelineResults }),
  };
});

describe('registerPipelineRoutes', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();

  const req = requestMock.create({
    method: 'post',
    path: CHECK_PIPELINE_PATH,
    body: {
      rawSamples: ['{"ei":0}'],
      pipeline: { processors: [{ script: { source: {} } }] },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    registerPipelineRoutes(server.router);
  });

  it('Runs route and gets CheckPipelineResponse', async () => {
    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.body).toEqual({
      results: { docs: [{ script: { source: {} } }] },
    });
    expect(response.status).toEqual(200);
  });

  describe('when the automatic import is not available', () => {
    beforeEach(() => {
      context.automaticImport.isAvailable.mockReturnValue(false);
    });

    it('returns a 404', async () => {
      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(response.status).toEqual(404);
    });
  });
});
