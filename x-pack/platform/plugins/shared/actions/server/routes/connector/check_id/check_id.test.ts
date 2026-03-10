/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkConnectorIdRoute } from './check_id';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../_mock_handler_arguments';
import { actionsClientMock } from '../../../actions_client/actions_client.mock';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { createMockConnector } from '../../../application/connector/mocks';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('checkConnectorIdRoute', () => {
  it('returns connectorIdAvailable: false when connector exists', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    checkConnectorIdRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connector/{id}/_check_availability"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.get.mockResolvedValueOnce(
      createMockConnector({
        id: 'existing-connector',
        actionTypeId: '.slack',
        name: 'Existing Connector',
      })
    );

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: { id: 'existing-connector' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith({
      body: { connectorIdAvailable: false },
    });
  });

  it('returns connectorIdAvailable: true when connector does not exist', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    checkConnectorIdRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    const notFoundError = new Error('Not found');
    (notFoundError as any).output = { statusCode: 404 };
    actionsClient.get.mockRejectedValueOnce(notFoundError);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: { id: 'new-connector-id' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith({
      body: { connectorIdAvailable: true },
    });
  });

  it('throws error for non-404 errors', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    checkConnectorIdRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    const serverError = new Error('Server error');
    (serverError as any).output = { statusCode: 500 };
    actionsClient.get.mockRejectedValueOnce(serverError);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: { id: 'some-connector-id' },
      },
      ['ok']
    );

    await expect(handler(context, req, res)).rejects.toThrow('Server error');
  });

  it('ensures the license allows checking connector id availability', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    checkConnectorIdRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    const notFoundError = new Error('Not found');
    (notFoundError as any).output = { statusCode: 404 };
    actionsClient.get.mockRejectedValueOnce(notFoundError);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: { id: 'test-id' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
