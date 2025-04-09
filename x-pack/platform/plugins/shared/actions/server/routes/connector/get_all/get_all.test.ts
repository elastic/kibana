/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllConnectorsRoute } from './get_all';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../_mock_handler_arguments';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { actionsClientMock } from '../../../actions_client/actions_client.mock';
import type { ConnectorWithExtraFindData } from '../../../application/connector/types';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

describe('getAllConnectorsRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
  });

  it('get all connectors with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAllConnectorsRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connectors"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Array [],
      }
    `);

    expect(actionsClient.getAll).toHaveBeenCalledTimes(1);

    expect(res.ok).toHaveBeenCalledWith({
      body: [],
    });
  });

  it('ensures the license allows getting all connectors', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAllConnectorsRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connectors"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('ensures the license check prevents getting all connectors', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('OMG');
    });

    getAllConnectorsRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connectors"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('filters out inference connectors without endpoints', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAllConnectorsRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connectors"`);

    const actionsClient = actionsClientMock.create();

    actionsClient.getAll.mockResolvedValueOnce([
      { id: '1', name: 'Connector 1', actionTypeId: '.email' },
      {
        id: '2',
        name: 'Connector 2',
        actionTypeId: '.inference',
        config: { inferenceId: '2' },
      },
      { id: '3', name: 'Connector 3', actionTypeId: '.inference', config: {} }, // Missing endpoint
    ] as ConnectorWithExtraFindData[]);

    const esClient = elasticsearchClientMock.createInternalClient();

    esClient.inference.get.mockResolvedValueOnce({
      endpoints: [{ inference_id: '2' } as InferenceInferenceEndpointInfo],
    });

    const [context, req, res] = mockHandlerArguments({ actionsClient, esClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith({
      body: [
        { id: '1', name: 'Connector 1', connector_type_id: '.email' },
        {
          id: '2',
          name: 'Connector 2',
          connector_type_id: '.inference',
          config: { inferenceId: '2' },
        },
      ],
    });
  });
});
