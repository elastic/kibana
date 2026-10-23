/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServiceMock } from '@kbn/core/server/mocks';
import type { GetConnectorSpecResult } from '../../../application/connector/methods/get_connector_spec/types';
import { getConnectorSpecResponseBodySchemaV1 } from '../../../../common/routes/connector/response';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../_mock_handler_arguments';
import { actionsClientMock } from '../../../actions_client/actions_client.mock';
import { actionsConfigMock } from '../../../actions_config.mock';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { getConnectorSpecRoute } from './get_spec';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

const formSchema = {
  type: 'object',
  properties: {
    config: { type: 'object', properties: {} },
    secrets: { type: 'object', properties: {} },
  },
};

const inputSchema = { type: 'object', properties: {} };

const serverResult: GetConnectorSpecResult = {
  metadata: {
    id: 'test-connector',
    displayName: 'Test Connector',
    description: 'A test connector',
    minimumLicense: 'basic',
    isTechnicalPreview: true,
    supportedFeatureIds: ['alerting'],
  },
  schema: formSchema,
  isTestable: true,
  authTypeIds: ['basic'],
  hasInboundEvents: false,
  isInboundOnly: false,
  isEarsExperimental: false,
  actions: [
    {
      name: 'listIncidents',
      description: 'List incidents',
      isTool: true,
      scope: 'read',
      inputSchema,
    },
  ],
};

const getConnectorSpecResult = (
  overrides: Partial<GetConnectorSpecResult> = {}
): GetConnectorSpecResult => ({ ...serverResult, ...overrides });

const configurationUtilities = actionsConfigMock.create();

const responseBody = {
  metadata: {
    id: 'test-connector',
    display_name: 'Test Connector',
    description: 'A test connector',
    minimum_license: 'basic',
    supported_feature_ids: ['alerting'],
    is_technical_preview: true,
  },
  schema: formSchema,
  is_testable: true,
  auth_type_ids: ['basic'],
  has_inbound_events: false,
  is_inbound_only: false,
  is_ears_experimental: false,
  actions: [
    {
      name: 'listIncidents',
      description: 'List incidents',
      is_tool: true,
      scope: 'read',
      input_schema: inputSchema,
    },
  ],
};

describe('getConnectorSpecRoute', () => {
  it('registers the route with correct path', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState, configurationUtilities);

    expect(router.get).toHaveBeenCalledTimes(1);
    const [config] = router.get.mock.calls[0];
    expect(config.path).toBe('/internal/actions/connector_types/{id}/spec');
  });

  it('registers the route with access internal', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState, configurationUtilities);

    const [config] = router.get.mock.calls[0];
    expect(config.options?.access).toBe('internal');
  });

  it('registers the route with default actions route security', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState, configurationUtilities);

    const [config] = router.get.mock.calls[0];
    expect(config.security).toEqual(DEFAULT_ACTION_ROUTE_SECURITY);
  });

  it('returns 200 with body from actionsClient.getConnectorSpec', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();
    actionsClient.getConnectorSpec.mockResolvedValue(getConnectorSpecResult());

    getConnectorSpecRoute(router, licenseState, configurationUtilities);

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
      configurationUtilities,
    });
    expect(() => getConnectorSpecResponseBodySchemaV1.validate(responseBody)).not.toThrow();
  });

  it('maps isTestable false to is_testable false in the response body', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();
    actionsClient.getConnectorSpec.mockResolvedValue(getConnectorSpecResult({ isTestable: false }));

    getConnectorSpecRoute(router, licenseState, configurationUtilities);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      { params: { id: 'test-connector' } },
      ['ok', 'notFound']
    );

    const result = await handler(context, req, res);

    expect(result).toEqual({
      body: expect.objectContaining({ is_testable: false }),
    });
  });

  it('propagates Boom notFound from actionsClient.getConnectorSpec (wrapped by handleLegacyErrors in production)', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();
    actionsClient.getConnectorSpec.mockRejectedValue(
      Boom.notFound('Spec for connector type "unknown-connector" not found.')
    );

    getConnectorSpecRoute(router, licenseState, configurationUtilities);

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
    actionsClient.getConnectorSpec.mockResolvedValue(getConnectorSpecResult());

    getConnectorSpecRoute(router, licenseState, configurationUtilities);

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

    getConnectorSpecRoute(router, licenseState, configurationUtilities);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, { params: { id: 'test-connector' } }, [
      'ok',
    ]);

    await expect(handler(context, req, res)).rejects.toThrow('License check failed');

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('propagates serialization failure from actionsClient.getConnectorSpec', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();
    actionsClient.getConnectorSpec.mockRejectedValue(
      new Error('Failed to serialize connector spec: Serialization error')
    );

    getConnectorSpecRoute(router, licenseState, configurationUtilities);

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

    getConnectorSpecRoute(router, licenseState, configurationUtilities);

    const [config] = router.get.mock.calls[0];

    expect(config.validate).toBeDefined();
    const validateConfig = config.validate as { request?: { params?: unknown } };
    expect(validateConfig.request?.params).toBeDefined();
  });

  it('has proper response schema validation', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState, configurationUtilities);

    const [config] = router.get.mock.calls[0];

    const validateConfig = config.validate as { response?: Record<number, unknown> };
    expect(validateConfig.response?.[200]).toBeDefined();
    expect(validateConfig.response?.[404]).toBeDefined();
    expect(validateConfig.response?.[500]).toBeDefined();
  });
});
