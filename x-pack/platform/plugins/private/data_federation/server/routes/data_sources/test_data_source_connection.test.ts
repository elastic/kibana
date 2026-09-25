/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';

import { DATA_SOURCE_TEST_ROUTE_PATH } from '../../../common';
import type { DataFederationConfigType } from '../../config';
import { testDataSourceBodySchema } from './data_source_schema';
import { registerTestDataSourceConnection } from './test_data_source_connection';

const defaultConfig: DataFederationConfigType = {
  enabled: true,
  enableFederatedIdentityAuth: false,
  enableGoogleCloudStorageDataSourceType: false,
  enableAzureDataSourceType: false,
};

const elasticsearchError = (statusCode: number, reason: string): Error =>
  Object.assign(new Error(`status_exception\n\tCaused by: ${reason}`), {
    statusCode,
    meta: { statusCode, body: { error: { type: 'status_exception', reason }, status: statusCode } },
  });

const setup = (config: Partial<DataFederationConfigType> = {}) => {
  const router = httpServiceMock.createRouter();
  registerTestDataSourceConnection(router, { ...defaultConfig, ...config });

  const [[routeConfig, handler]] = router.post.mock.calls;
  const coreContext = coreMock.createRequestHandlerContext();
  const context = coreMock.createCustomRequestHandlerContext({ core: coreContext });
  const esRequest = coreContext.elasticsearch.client.asCurrentUser.transport.request;
  const response = httpServerMock.createResponseFactory();

  const callRoute = (body: Record<string, unknown>) =>
    (handler as RequestHandler)(
      context,
      httpServerMock.createKibanaRequest({ method: 'post', body }),
      response
    );

  return { routeConfig, esRequest, response, callRoute };
};

describe('registerTestDataSourceConnection', () => {
  it('registers an internal POST route on the test path', () => {
    const { routeConfig } = setup();

    expect(routeConfig.path).toBe(DATA_SOURCE_TEST_ROUTE_PATH);
    expect(routeConfig.options).toEqual({ access: 'internal' });
  });

  it('proxies the configuration to Elasticsearch and returns its result', async () => {
    const { esRequest, response, callRoute } = setup();
    const result = { status: 'failure', error: 'The AWS Access Key Id does not exist.' };
    esRequest.mockResolvedValue(result);
    const body = { type: 's3', settings: { auth: 'static_credentials', access_key: 'key' } };

    await callRoute(body);

    expect(esRequest).toHaveBeenCalledWith(
      { method: 'POST', path: '/_query/data_source/_test', body },
      { requestTimeout: '60s', maxRetries: 0 }
    );
    expect(response.ok).toHaveBeenCalledWith({ body: result });
  });

  it.each([
    ['gcs', 'Google Cloud Storage data sources are disabled by configuration.'],
    ['azure', 'Azure data sources are disabled by configuration.'],
  ])('rejects a %s data source when the type is disabled', async (type, message) => {
    const { esRequest, response, callRoute } = setup();

    await callRoute({ type, settings: {} });

    expect(esRequest).not.toHaveBeenCalled();
    expect(response.badRequest).toHaveBeenCalledWith({ body: { message } });
  });

  it('tests a gcs data source when the type is enabled', async () => {
    const { esRequest, response, callRoute } = setup({
      enableGoogleCloudStorageDataSourceType: true,
    });
    esRequest.mockResolvedValue({ status: 'untestable' });

    await callRoute({ type: 'gcs', settings: { auth: 'anonymous' } });

    expect(response.ok).toHaveBeenCalledWith({ body: { status: 'untestable' } });
  });

  it('keeps the Elasticsearch status code and reason of a request error', async () => {
    const { esRequest, response, callRoute } = setup();
    esRequest.mockRejectedValue(
      elasticsearchError(403, 'this action is unauthorized for user [test_user]')
    );

    await callRoute({ type: 's3', settings: { auth: 'anonymous' } });

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: { message: 'this action is unauthorized for user [test_user]' },
    });
    expect(response.badRequest).not.toHaveBeenCalled();
  });

  it('reports an error without a status code as a bad request', async () => {
    const { esRequest, response, callRoute } = setup();
    esRequest.mockRejectedValue(new Error('socket hang up'));

    await callRoute({ type: 's3', settings: { auth: 'anonymous' } });

    expect(response.badRequest).toHaveBeenCalledWith({ body: { message: 'socket hang up' } });
    expect(response.customError).not.toHaveBeenCalled();
  });
});

describe('testDataSourceBodySchema', () => {
  it('accepts a type and its settings', () => {
    const body = { type: 's3', settings: { region: 'us-east-1', auth: 'anonymous' } };

    expect(testDataSourceBodySchema.validate(body)).toEqual(body);
  });

  it('rejects the name and description the save route accepts', () => {
    expect(() =>
      testDataSourceBodySchema.validate({ type: 's3', name: 'ds', settings: {} })
    ).toThrow();
    expect(() =>
      testDataSourceBodySchema.validate({ type: 's3', description: 'd', settings: {} })
    ).toThrow();
  });

  it('rejects a null secret, which only has meaning when updating a saved data source', () => {
    expect(() =>
      testDataSourceBodySchema.validate({ type: 's3', settings: { secret_key: null } })
    ).toThrow();
  });

  it('rejects an unknown data source type', () => {
    expect(() => testDataSourceBodySchema.validate({ type: 'http', settings: {} })).toThrow();
  });
});
