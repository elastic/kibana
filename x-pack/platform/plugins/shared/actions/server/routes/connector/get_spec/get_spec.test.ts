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
import { getConnectorSpecRoute } from './get_spec';
import type { ActionsConfigurationUtilities } from '../../../actions_config';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';
import { actionsClientMock } from '../../../mocks';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

const createActionsConfigUtilsMock = (
  overrides: Partial<{
    pfxEnabled: boolean;
    earsEnabled: boolean;
  }> = {}
): ActionsConfigurationUtilities =>
  ({
    getWebhookSettings: jest.fn(() => ({
      ssl: { pfx: { enabled: overrides.pfxEnabled ?? true } },
    })),
    isEarsEnabled: jest.fn(() => overrides.earsEnabled ?? false),
  } as unknown as ActionsConfigurationUtilities);

describe('getConnectorSpecRoute', () => {
  it('registers the route with correct path', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState, createActionsConfigUtilsMock());

    expect(router.get).toHaveBeenCalledTimes(1);
    const [config] = router.get.mock.calls[0];
    expect(config.path).toBe('/internal/actions/connector_types/{id}/spec');
  });

  it('registers the route with access internal', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState, createActionsConfigUtilsMock());

    const [config] = router.get.mock.calls[0];
    expect(config.options?.access).toBe('internal');
  });

  it('registers the route with default actions route security', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState, createActionsConfigUtilsMock());

    const [config] = router.get.mock.calls[0];
    expect(config.security).toEqual(DEFAULT_ACTION_ROUTE_SECURITY);
  });

  it('returns 200 with body from actionsClient.getConnectorSpec', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsConfigUtils = createActionsConfigUtilsMock();
    const actionsClient = actionsClientMock.create();
    const clientResult = {
      metadata: {
        id: 'test-connector',
        displayName: 'Test Connector',
        description: 'A test connector',
        minimumLicense: 'basic' as const,
        supportedFeatureIds: ['alerting'] as const,
        isTechnicalPreview: true,
      },
      schema: {
        type: 'object',
        properties: {
          config: { type: 'object', properties: {} },
          secrets: { type: 'object', properties: {} },
        },
      },
    };
    const responseBody = {
      metadata: {
        id: 'test-connector',
        display_name: 'Test Connector',
        description: 'A test connector',
        minimum_license: 'basic',
        supported_feature_ids: ['alerting'],
        is_technical_preview: true,
      },
      schema: clientResult.schema,
    };
    actionsClient.getConnectorSpec.mockResolvedValue(clientResult as never);

    getConnectorSpecRoute(router, licenseState, actionsConfigUtils);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      { params: { id: 'test-connector' } },
      ['ok', 'notFound']
    );

    const result = await handler(context, req, res);

    expect(result).toEqual({ body: responseBody });
    expect(res.ok).toHaveBeenCalled();
    expect(actionsClient.getConnectorSpec).toHaveBeenCalledWith({
      id: 'test-connector',
      configurationUtilities: actionsConfigUtils,
    });
  });

  it('passes configuration utilities from route registration to getConnectorSpec', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsConfigUtils = createActionsConfigUtilsMock({
      pfxEnabled: false,
      earsEnabled: true,
    });
    const actionsClient = actionsClientMock.create();
    actionsClient.getConnectorSpec.mockResolvedValue({
      metadata: {
        id: 'test-connector',
        displayName: 'Test',
        description: 'Test',
        minimumLicense: 'basic',
        supportedFeatureIds: ['alerting'],
      },
      schema: {},
    } as never);

    getConnectorSpecRoute(router, licenseState, actionsConfigUtils);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      { params: { id: 'test-connector' } },
      ['ok', 'notFound']
    );

    await handler(context, req, res);

    expect(actionsClient.getConnectorSpec).toHaveBeenCalledWith({
      id: 'test-connector',
      configurationUtilities: actionsConfigUtils,
    });
  });

  it('propagates Boom notFound from getConnectorSpec (wrapped by handleLegacyErrors in production)', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();
    actionsClient.getConnectorSpec.mockRejectedValue(
      Boom.notFound('Spec for connector type "unknown-connector" not found.')
    );

    getConnectorSpecRoute(router, licenseState, createActionsConfigUtilsMock());

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      { params: { id: 'unknown-connector' } },
      ['ok', 'customError']
    );

    await expect(handler(context, req, res)).rejects.toMatchObject({
      output: {
        statusCode: 404,
        payload: expect.objectContaining({
          message: 'Spec for connector type "unknown-connector" not found.',
        }),
      },
    });
  });

  it('ensures the license allows getting connector spec', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();
    actionsClient.getConnectorSpec.mockResolvedValue({
      metadata: {
        id: 'test-connector',
        displayName: 'Test',
        description: 'Test',
        minimumLicense: 'basic',
        supportedFeatureIds: ['alerting'],
      },
      schema: {},
    } as never);

    getConnectorSpecRoute(router, licenseState, createActionsConfigUtilsMock());

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      { params: { id: 'test-connector' } },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('ensures the license check prevents getting connector spec', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('License check failed');
    });

    getConnectorSpecRoute(router, licenseState, createActionsConfigUtilsMock());

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, { params: { id: 'test-connector' } }, [
      'ok',
    ]);

    await expect(handler(context, req, res)).rejects.toThrow('License check failed');

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('propagates serialization failure from getConnectorSpec', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();
    actionsClient.getConnectorSpec.mockRejectedValue(
      new Error('Failed to serialize connector spec: Serialization error')
    );

    getConnectorSpecRoute(router, licenseState, createActionsConfigUtilsMock());

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      { params: { id: 'test-connector' } },
      ['ok']
    );

    await expect(handler(context, req, res)).rejects.toThrow(
      'Failed to serialize connector spec: Serialization error'
    );
  });

  it('validates request params schema', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState, createActionsConfigUtilsMock());

    const [config] = router.get.mock.calls[0];

    expect(config.validate).toBeDefined();
    const validateConfig = config.validate as { request?: { params?: unknown } };
    expect(validateConfig.request?.params).toBeDefined();
  });

  it('has proper response schema validation', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState, createActionsConfigUtilsMock());

    const [config] = router.get.mock.calls[0];

    const validateConfig = config.validate as { response?: Record<number, unknown> };
    expect(validateConfig.response?.[200]).toBeDefined();
    expect(validateConfig.response?.[404]).toBeDefined();
    expect(validateConfig.response?.[500]).toBeDefined();
  });
});
