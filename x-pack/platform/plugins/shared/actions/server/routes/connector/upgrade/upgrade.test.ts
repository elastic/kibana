/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import {
  upgradeConnectorParamsSchemaV1,
  upgradeConnectorResponseSchemaV1,
} from '../../../../common/routes/connector/apis/upgrade';
import { createMockConnector } from '../../../application/connector/mocks';
import { actionsClientMock } from '../../../actions_client/actions_client.mock';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../_mock_handler_arguments';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { upgradeConnectorRoute } from './upgrade';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn((_license, handler) => handler),
}));

describe('upgradeConnectorRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers an internal POST upgrade route', () => {
    const router = httpServiceMock.createRouter();
    upgradeConnectorRoute(router, licenseStateMock.create());

    const [config] = router.post.mock.calls[0];
    expect(config.path).toBe('/internal/actions/connector/{id}/_upgrade');
    expect(config.options?.access).toBe('internal');
    const validate = config.validate as {
      request?: { params?: unknown };
      response?: { 200?: { body: () => unknown } };
    };
    expect(validate.request?.params).toBe(upgradeConnectorParamsSchemaV1);
    expect(validate.response?.[200]?.body()).toBe(upgradeConnectorResponseSchemaV1);
  });

  it('returns a snake_case upgrade result', async () => {
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();
    actionsClient.upgrade.mockResolvedValue({
      status: 'upgraded',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      connector: createMockConnector({
        id: 'connector-id',
        actionTypeId: '.declarative-example',
        specId: '.declarative-example',
        specVersion: '2.0.0',
        activeSpecVersion: '2.0.0',
      }),
    });
    upgradeConnectorRoute(router, licenseStateMock.create());

    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      { params: { id: 'connector-id' } },
      ['ok']
    );

    await handler(context, req, res);

    expect(actionsClient.upgrade).toHaveBeenCalledWith({ id: 'connector-id' });
    expect(res.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        status: 'upgraded',
        from_version: '1.0.0',
        to_version: '2.0.0',
        connector: expect.objectContaining({
          connector_type_id: '.declarative-example',
          spec_version: '2.0.0',
          active_spec_version: '2.0.0',
        }),
      }),
    });
    const response = (res.ok as jest.Mock).mock.calls[0][0].body;
    expect(response.connector).not.toHaveProperty('secrets');
  });

  it('uses the standard license access wrapper', () => {
    const router = httpServiceMock.createRouter();
    const licenseState = licenseStateMock.create();
    upgradeConnectorRoute(router, licenseState);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
