/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorAuthStatusRoute } from './auth_status';
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

describe('connectorAuthStatusRoute', () => {
  it('registers POST at /internal/actions/connectors/_me/auth_status', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    connectorAuthStatusRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/actions/connectors/_me/auth_status"`);
    expect(config.options?.access).toBe('internal');

    const actionsClient = actionsClientMock.create();
    actionsClient.getAuthStatus.mockResolvedValueOnce({
      'connector-1': { userAuthStatus: 'connected' },
    });

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "connector-1": Object {
            "user_auth_status": "connected",
          },
        },
      }
    `);

    expect(actionsClient.getAuthStatus).toHaveBeenCalled();

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        'connector-1': { user_auth_status: 'connected' },
      },
    });
  });

  it('wraps handler with verifyAccessAndContext using licenseState', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    connectorAuthStatusRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    actionsClient.getAuthStatus.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('propagates error when license check fails', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('OMG');
    });

    connectorAuthStatusRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    actionsClient.getAuthStatus.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
