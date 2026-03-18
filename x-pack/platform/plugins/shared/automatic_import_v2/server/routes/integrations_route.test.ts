/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AIV2TelemetryEventType } from '../../common';
import { registerIntegrationRoutes } from './integrations_route';

// Extract the handler from the versioned router mock
const getVersionedRouteHandler = (
  routerMock: ReturnType<typeof httpServiceMock.createRouter>,
  method: 'post',
  path: string
) => {
  const route = routerMock.versioned.getRoute(method, path);
  const version = route.versions['1'];
  if (!version) throw new Error(`No version '1' registered for ${method} ${path}`);
  return version.handler;
};

describe('approveIntegrationRoute telemetry', () => {
  const APPROVE_PATH = '/api/automatic_import_v2/integrations/{integration_id}/approve';

  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let logger: ReturnType<typeof loggerMock.create>;
  let reportTelemetryEvent: jest.Mock;
  let approveIntegration: jest.Mock;
  let getIntegrationById: jest.Mock;
  let getAllDataStreams: jest.Mock;
  let getCurrentUser: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    logger = loggerMock.create();

    reportTelemetryEvent = jest.fn();
    approveIntegration = jest.fn().mockResolvedValue(undefined);
    getIntegrationById = jest.fn().mockResolvedValue({ title: 'My Integration' });
    getAllDataStreams = jest.fn();
    getCurrentUser = jest.fn().mockResolvedValue({ username: 'test-user' });

    registerIntegrationRoutes(router as any, logger);
  });

  const makeContext = () =>
    ({
      automaticImportv2: Promise.resolve({
        automaticImportService: {
          approveIntegration,
          getIntegrationById,
          getAllDataStreams,
        },
        getCurrentUser,
        reportTelemetryEvent,
      }),
    } as any);

  const makeRequest = (integrationId = 'int-1') =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: APPROVE_PATH,
      params: { integration_id: integrationId },
      body: { version: '1.0.0', categories: ['security'] },
      headers: { 'x-session-id': 'sess-abc' },
    });

  const makeResponse = () => httpServerMock.createResponseFactory();

  it('calls reportTelemetryEvent once per data stream on successful approve', async () => {
    getAllDataStreams.mockResolvedValue([{ title: 'DS One' }, { title: 'DS Two' }]);

    const handler = getVersionedRouteHandler(router, 'post', APPROVE_PATH);
    const response = makeResponse();
    await handler(makeContext(), makeRequest(), response);

    expect(reportTelemetryEvent).toHaveBeenCalledTimes(2);

    expect(reportTelemetryEvent).toHaveBeenNthCalledWith(
      1,
      AIV2TelemetryEventType.IntegrationInstalled,
      expect.objectContaining({
        sessionId: 'sess-abc',
        integrationName: 'My Integration',
        version: '1.0.0',
        dataStreamCount: 2,
        dataStreamName: 'DS One',
      })
    );

    expect(reportTelemetryEvent).toHaveBeenNthCalledWith(
      2,
      AIV2TelemetryEventType.IntegrationInstalled,
      expect.objectContaining({
        dataStreamName: 'DS Two',
      })
    );
  });

  it('does not call reportTelemetryEvent when there are no data streams', async () => {
    getAllDataStreams.mockResolvedValue([]);

    const handler = getVersionedRouteHandler(router, 'post', APPROVE_PATH);
    await handler(makeContext(), makeRequest(), makeResponse());

    expect(reportTelemetryEvent).not.toHaveBeenCalled();
  });

  it('still returns 200 when telemetry reporting fails', async () => {
    getAllDataStreams.mockRejectedValue(new Error('db error'));

    const handler = getVersionedRouteHandler(router, 'post', APPROVE_PATH);
    const response = makeResponse();
    await handler(makeContext(), makeRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { message: 'Integration approved successfully' },
    });
    expect(reportTelemetryEvent).not.toHaveBeenCalled();
  });

  it('returns 500 when approveIntegration fails', async () => {
    approveIntegration.mockRejectedValue(new Error('approve failed'));

    const handler = getVersionedRouteHandler(router, 'post', APPROVE_PATH);
    const response = makeResponse();
    await handler(makeContext(), makeRequest(), response);

    expect(response.ok).not.toHaveBeenCalled();
    expect(reportTelemetryEvent).not.toHaveBeenCalled();
  });
});
