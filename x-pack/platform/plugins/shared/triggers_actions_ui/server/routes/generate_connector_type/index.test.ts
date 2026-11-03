/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReservedPrivilegesSet } from '@kbn/core/server';
import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import { CONNECTOR_BUILDER_INFERENCE_FEATURE_ID } from '../../../common/connector_type_generation';
import { fetchDocumentation } from './fetch_documentation';
import { generateConnectorTypeSpec } from './generate_connector_type_spec';
import { createGenerateConnectorTypeRoute } from '.';
import { GenerateConnectorTypeError } from './types';
import type { GenerateConnectorTypeErrorReason } from '../../../common/connector_type_generation';

jest.mock('./fetch_documentation', () => ({
  fetchDocumentation: jest.fn(),
}));
jest.mock('./generate_connector_type_spec', () => ({
  generateConnectorTypeSpec: jest.fn(),
}));

const fetchDocumentationMock = fetchDocumentation as jest.MockedFunction<typeof fetchDocumentation>;
const generateConnectorTypeSpecMock = generateConnectorTypeSpec as jest.MockedFunction<
  typeof generateConnectorTypeSpec
>;

const connectorType = {
  id: 'acme',
  displayName: 'Acme',
  description: 'Talks to Acme',
  config: [],
  auth: { type: 'none' as const },
  actions: {
    ping: {
      description: 'Ping',
      scope: 'read' as const,
      input: [],
      request: { method: 'GET' as const, url: 'https://example.com/ping' },
    },
  },
};

const register = () => {
  const router = httpServiceMock.createRouter();
  const logger = loggingSystemMock.create().get();
  const getActionsConfigurationUtilities = jest.fn().mockReturnValue({});
  const getInference = jest.fn();
  createGenerateConnectorTypeRoute({
    logger,
    router,
    baseRoute: '/internal/triggers_actions_ui',
    getActionsConfigurationUtilities,
    getInference,
  });
  const [config, handler] = router.post.mock.calls[0];
  return { config, handler, getInference, getActionsConfigurationUtilities };
};

describe('createGenerateConnectorTypeRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the internal superuser route', () => {
    const { config } = register();

    expect(config.path).toBe('/internal/triggers_actions_ui/connector_types/_generate');
    expect(config.options).toEqual(expect.objectContaining({ access: 'internal' }));
    expect(config.security).toEqual({
      authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] },
    });
    const bodySchema = (
      config.validate as {
        request: { body: { safeParse: (value: unknown) => { success: boolean } } };
      }
    ).request.body;
    expect(bodySchema.safeParse({ url: 'https://docs.example.com/api' }).success).toBe(true);
    expect(bodySchema.safeParse({ url: 'not a url' }).success).toBe(false);
    expect(bodySchema.safeParse({ url: 'https://docs.example.com', extra: 1 }).success).toBe(false);
  });

  it('returns no_model when inference is unavailable', async () => {
    const { handler, getInference } = register();
    getInference.mockResolvedValue(undefined);
    const response = httpServerMock.createResponseFactory();

    await handler(
      {},
      httpServerMock.createKibanaRequest({ body: { url: 'https://docs.example.com/api' } }),
      response
    );

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: {
        message: expect.stringContaining('No AI model is available'),
        attributes: { reason: 'no_model' },
      },
    });
    expect(fetchDocumentationMock).not.toHaveBeenCalled();
  });

  it('returns the generated connector type', async () => {
    const { handler, getInference } = register();
    const inference = inferenceMock.createStartContract();
    const client = { chatComplete: jest.fn() };
    inference.getClient.mockReturnValue(client as never);
    getInference.mockResolvedValue(inference);
    fetchDocumentationMock.mockResolvedValue({
      url: 'https://docs.example.com/api',
      contentType: 'text/html',
      text: 'docs',
    });
    generateConnectorTypeSpecMock.mockResolvedValue(connectorType);
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      body: { url: 'https://docs.example.com/api' },
    });

    await handler({}, request, response);

    expect(generateConnectorTypeSpecMock).toHaveBeenCalledWith(
      expect.objectContaining({
        inferenceClient: client,
        featureId: CONNECTOR_BUILDER_INFERENCE_FEATURE_ID,
        document: expect.objectContaining({ text: 'docs' }),
      })
    );
    expect(response.ok).toHaveBeenCalledWith({ body: { connectorType } });
  });

  it.each<[GenerateConnectorTypeErrorReason, number]>([
    ['invalid_url', 400],
    ['blocked_destination', 400],
    ['fetch_failed', 400],
    ['unsupported_content', 400],
    ['too_large', 400],
    ['no_model', 400],
    ['model_error', 502],
    ['invalid_output', 422],
  ])('maps %s to %s', async (reason, statusCode) => {
    const { handler, getInference } = register();
    getInference.mockResolvedValue(inferenceMock.createStartContract());
    fetchDocumentationMock.mockRejectedValue(
      new GenerateConnectorTypeError(reason, `failed: ${reason}`, statusCode)
    );
    const response = httpServerMock.createResponseFactory();

    await handler(
      {},
      httpServerMock.createKibanaRequest({ body: { url: 'https://docs.example.com/api' } }),
      response
    );

    expect(response.customError).toHaveBeenCalledWith({
      statusCode,
      body: { message: `failed: ${reason}`, attributes: { reason } },
    });
  });

  it('rethrows unknown errors', async () => {
    const { handler, getInference } = register();
    getInference.mockResolvedValue(inferenceMock.createStartContract());
    fetchDocumentationMock.mockRejectedValue(new Error('boom'));

    await expect(
      handler(
        {},
        httpServerMock.createKibanaRequest({ body: { url: 'https://docs.example.com/api' } }),
        httpServerMock.createResponseFactory()
      )
    ).rejects.toThrow('boom');
  });
});
