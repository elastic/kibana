/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverMock } from '../__mocks__/mock_server';
import { requestMock } from '../__mocks__/request';
import { requestContextMock } from '../__mocks__/request_context';
import { CATEGORIZATION_GRAPH_PATH } from '../../common';
import { registerCategorizationRoutes } from './categorization_routes';

const mockResult = jest.fn().mockResolvedValue({
  results: {
    pipeline: {
      processors: [{ script: { source: {} } }],
    },
    docs: [],
  },
});

jest.mock('../graphs/categorization', () => {
  return {
    getCategorizationGraph: jest.fn().mockResolvedValue({
      withConfig: () => ({
        invoke: () => mockResult(),
      }),
    }),
  };
});

describe('registerCategorizationRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();

  const req = requestMock.create({
    method: 'post',
    path: CATEGORIZATION_GRAPH_PATH,
    body: {
      packageName: 'pack',
      dataStreamName: 'testStream',
      rawSamples: ['{"ei":0}'],
      currentPipeline: { processors: [{ script: { source: {} } }] },
      connectorId: 'testConnector',
      samplesFormat: { name: 'json' },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    registerCategorizationRoutes(server.router);
  });

  it('Runs route and gets CategorizationResponse', async () => {
    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.body).toEqual({
      results: { docs: [], pipeline: { processors: [{ script: { source: {} } }] } },
    });
    expect(response.status).toEqual(200);
  });

  it('Runs route with badRequest', async () => {
    mockResult.mockResolvedValueOnce({});
    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.status).toEqual(400);
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
