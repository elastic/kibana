/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverMock } from '../__mocks__/mock_server';
import { requestMock } from '../__mocks__/request';
import { requestContextMock } from '../__mocks__/request_context';
import { INTEGRATION_BUILDER_PATH } from '../../common';
import { registerIntegrationBuilderRoutes } from './build_integration_routes';

jest.mock('../integration_builder', () => {
  return {
    buildPackage: jest.fn().mockReturnValue(Buffer.from('{"test" : "test"}')),
  };
});

describe('registerIntegrationBuilderRoutes', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();

  const req = requestMock.create({
    method: 'post',
    path: INTEGRATION_BUILDER_PATH,
    body: {
      integration: {
        name: 'Test',
        title: 'Title',
        description: 'Description',
        dataStreams: [
          {
            name: 'dsName',
            title: 'dsTitle',
            description: 'dsDesc',
            inputTypes: ['filestream'],
            rawSamples: ['{"ei":0}'],
            pipeline: {
              processors: [{ script: { source: {} } }],
            },
            docs: [],
            samplesFormat: { name: 'ndjson', multiline: false },
          },
        ],
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    registerIntegrationBuilderRoutes(server.router);
  });

  it('Runs route and gets CheckPipelineResponse', async () => {
    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.body).toEqual({ test: 'test' });
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
