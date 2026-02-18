/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments, mockResponseFactory } from '../../_mock_handler_arguments';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { getConnectorSpecRoute } from './get_spec';

// Mock the connector specs module
jest.mock('@kbn/connector-specs', () => {
  const mockSpec = {
    metadata: {
      id: 'test-connector',
      displayName: 'Test Connector',
      description: 'A test connector',
      minimumLicense: 'basic',
      supportedFeatureIds: ['alerting'],
    },
    schema: {
      config: { type: 'object', properties: {} },
      secrets: { type: 'object', properties: {} },
    },
  };

  return {
    connectorsSpecs: {
      testConnector: mockSpec,
    },
    serializeConnectorSpec: jest.fn((spec) => ({
      metadata: spec.metadata,
      schema: { type: 'object', properties: spec.schema },
    })),
  };
});

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

// Get the mocked serializeConnectorSpec for assertions
const { serializeConnectorSpec } = jest.requireMock('@kbn/connector-specs');

beforeEach(() => {
  jest.clearAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('getConnectorSpecRoute', () => {
  it('registers the route with correct path', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState);

    expect(router.get).toHaveBeenCalledTimes(1);
    const [config] = router.get.mock.calls[0];
    expect(config.path).toBe('/internal/actions/connector_types/{id}/spec');
  });

  it('returns 200 with serialized spec for valid connector ID', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      { params: { id: 'test-connector' } },
      ['ok', 'notFound']
    );

    const result = await handler(context, req, res);

    expect(result).toEqual({
      body: {
        metadata: {
          id: 'test-connector',
          displayName: 'Test Connector',
          description: 'A test connector',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: {
          type: 'object',
          properties: {
            config: { type: 'object', properties: {} },
            secrets: { type: 'object', properties: {} },
          },
        },
      },
    });

    expect(res.ok).toHaveBeenCalled();
    expect(serializeConnectorSpec).toHaveBeenCalled();
  });

  it('returns 404 for unknown connector ID', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      { params: { id: 'unknown-connector' } },
      ['ok', 'notFound']
    );

    await handler(context, req, res);

    expect(res.notFound).toHaveBeenCalledWith({
      body: { message: 'Spec for connector type "unknown-connector" not found.' },
    });
  });

  it('ensures the license allows getting connector spec', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
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

    getConnectorSpecRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      { params: { id: 'test-connector' } },
      ['ok']
    );

    await expect(handler(context, req, res)).rejects.toThrow('License check failed');

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('returns 500 when serialization fails', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    // Make serializeConnectorSpec throw an error
    serializeConnectorSpec.mockImplementationOnce(() => {
      throw new Error('Serialization error');
    });

    getConnectorSpecRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      { params: { id: 'test-connector' } },
      ['ok', 'customError']
    );

    await handler(context, req, res);

    expect(res.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Failed to serialize connector spec: Serialization error',
      },
    });
  });

  it('validates request params schema', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState);

    const [config] = router.get.mock.calls[0];

    // Check that request validation is configured
    expect(config.validate).toBeDefined();
    expect(config.validate?.request?.params).toBeDefined();
  });

  it('has proper response schema validation', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecRoute(router, licenseState);

    const [config] = router.get.mock.calls[0];

    // Check that response validation is configured for 200, 404, and 500
    expect(config.validate?.response?.[200]).toBeDefined();
    expect(config.validate?.response?.[404]).toBeDefined();
    expect(config.validate?.response?.[500]).toBeDefined();
  });
});
