/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../_mock_handler_arguments';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { actionsClientMock } from '../../../mocks';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';
import { upgradeConnectorRoute } from './upgrade';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('upgradeConnectorRoute', () => {
  it('registers a public POST route with the default security', () => {
    const router = httpServiceMock.createRouter();

    upgradeConnectorRoute(router, licenseStateMock.create());

    const [config] = router.post.mock.calls[0];
    expect(config.path).toBe('/api/actions/connector/{id}/_upgrade');
    expect(config.options?.access).toBe('public');
    expect(config.security).toEqual(DEFAULT_ACTION_ROUTE_SECURITY);
  });

  it('upgrades the connector and returns the connector response with spec_version', async () => {
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();
    actionsClient.upgrade.mockResolvedValue({
      id: 'c1',
      actionTypeId: '.abuseipdb',
      name: 'pinned',
      config: { baseUrl: 'http://127.0.0.1:8090' },
      isMissingSecrets: false,
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
      isConnectorTypeDeprecated: false,
      authMode: 'shared',
      specVersion: '1.1.0',
    });

    upgradeConnectorRoute(router, licenseStateMock.create());
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      { params: { id: 'c1' }, body: { spec_version: '1.1.0' } },
      ['ok']
    );

    await handler(context, req, res);

    expect(actionsClient.upgrade).toHaveBeenCalledWith({ id: 'c1', specVersion: '1.1.0' });
    expect(res.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        id: 'c1',
        connector_type_id: '.abuseipdb',
        spec_version: '1.1.0',
      }),
    });
  });

  it('propagates Boom errors (handleLegacyErrors maps them to their status in production)', async () => {
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();
    actionsClient.upgrade.mockRejectedValue(Boom.badRequest('Only the active spec version'));

    upgradeConnectorRoute(router, licenseStateMock.create());
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      { params: { id: 'c1' }, body: { spec_version: '1.0.0' } },
      ['ok', 'badRequest', 'customError']
    );

    await expect(handler(context, req, res)).rejects.toThrow('Only the active spec version');
    expect(res.ok).not.toHaveBeenCalled();
  });
});
