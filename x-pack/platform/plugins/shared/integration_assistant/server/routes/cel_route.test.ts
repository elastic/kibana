/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverMock } from '../__mocks__/mock_server';
import { requestMock } from '../__mocks__/request';
import { requestContextMock } from '../__mocks__/request_context';
import { CEL_INPUT_GRAPH_PATH } from '../../common';
import { registerCelInputRoutes } from './cel_routes';
import { validateCelTaskMock } from '../../__jest__/fixtures/cel';

const mockResult = jest.fn().mockResolvedValue({
  results: {
    program: '',
    stateSettings: {},
    redactVars: [],
  },
});

jest.mock('../graphs/cel', () => {
  return {
    getCelGraph: jest.fn().mockResolvedValue({
      withConfig: () => ({
        invoke: () => mockResult(),
      }),
    }),
  };
});

describe('registerCelInputRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();

  const req = requestMock.create({
    method: 'post',
    path: CEL_INPUT_GRAPH_PATH,
    body: {
      connectorId: 'testConnector',
      dataStreamName: 'testStream',
      apiDefinition: 'testApiDefinitionFileContents',
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    registerCelInputRoutes(server.router, validateCelTaskMock);
  });

  it('Runs route and gets CelInputResponse', async () => {
    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.body).toEqual({
      results: { program: '', stateSettings: {}, redactVars: [] },
    });
    expect(response.status).toEqual(200);
  });

  it('Runs route with badRequest', async () => {
    mockResult.mockResolvedValueOnce({});
    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.status).toEqual(400);
  });

  describe('when the integration assistant is not available', () => {
    beforeEach(() => {
      context.integrationAssistant.isAvailable.mockReturnValue(false);
    });

    it('returns a 404', async () => {
      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(response.status).toEqual(404);
    });
  });
});
