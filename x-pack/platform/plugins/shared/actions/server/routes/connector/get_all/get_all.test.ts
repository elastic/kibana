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

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('getAllConnectorsRoute', () => {
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

  it('returns connectors with authMode "shared"', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAllConnectorsRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([
      {
        id: '1',
        name: 'Test Connector',
        actionTypeId: '.webhook',
        config: {},
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        referencedByCount: 0,
        authMode: 'shared',
      },
    ]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    const result = await handler(context, req, res);

    expect(result).toMatchObject({
      body: [
        {
          id: '1',
          name: 'Test Connector',
          connector_type_id: '.webhook',
          is_preconfigured: false,
          is_deprecated: false,
          is_system_action: false,
          is_connector_type_deprecated: false,
          referenced_by_count: 0,
          auth_mode: 'shared',
        },
      ],
    });

    expect(actionsClient.getAll).toHaveBeenCalledTimes(1);
  });

  it('returns connectors with authMode "per-user"', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAllConnectorsRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([
      {
        id: '1',
        name: 'Test Connector',
        actionTypeId: '.webhook',
        config: {},
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        referencedByCount: 0,
        authMode: 'per-user',
      },
    ]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    const result = await handler(context, req, res);

    expect(result).toMatchObject({
      body: [
        {
          id: '1',
          name: 'Test Connector',
          connector_type_id: '.webhook',
          is_preconfigured: false,
          is_deprecated: false,
          is_system_action: false,
          is_connector_type_deprecated: false,
          referenced_by_count: 0,
          auth_mode: 'per-user',
        },
      ],
    });

    expect(actionsClient.getAll).toHaveBeenCalledTimes(1);
  });

  it('returns connectors without authMode when not set', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAllConnectorsRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([
      {
        id: '1',
        name: 'Test Connector',
        actionTypeId: '.slack',
        config: {},
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        referencedByCount: 0,
      },
    ]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith({
      body: expect.arrayContaining([
        expect.objectContaining({
          id: '1',
          name: 'Test Connector',
          connector_type_id: '.slack',
        }),
      ]),
    });

    const responseBody = (res.ok as jest.Mock).mock.calls[0][0].body;
    expect(responseBody[0]).not.toHaveProperty('auth_mode');

    expect(actionsClient.getAll).toHaveBeenCalledTimes(1);
  });
});
