/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { AutomaticImportPluginRequestHandlerContext } from '../types';
import { AutomaticImportTelemetryEventType, DownloadIntentEnum } from '../../common';
import { registerIntegrationRoutes } from './integrations_route';

// Extract the handler from the versioned router mock
const getVersionedRouteHandler = (
  routerMock: ReturnType<typeof httpServiceMock.createRouter>,
  method: Parameters<typeof routerMock.versioned.getRoute>[0],
  path: string
) => {
  const route = routerMock.versioned.getRoute(method, path);
  const version = route.versions['1'];
  if (!version) throw new Error(`No version '1' registered for ${method} ${path}`);
  return version.handler;
};

describe('approveIntegrationRoute telemetry', () => {
  const APPROVE_PATH = '/api/automatic_import/integrations/{integration_id}/approve';

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

    registerIntegrationRoutes(
      router as unknown as IRouter<AutomaticImportPluginRequestHandlerContext>,
      logger
    );
  });

  const makeContext = (): AutomaticImportPluginRequestHandlerContext =>
    ({
      automaticImport: Promise.resolve({
        automaticImportService: {
          approveIntegration,
          getIntegrationById,
          getAllDataStreams,
        },
        getCurrentUser,
        reportTelemetryEvent,
        isAvailable: () => true,
      }),
    } as unknown as AutomaticImportPluginRequestHandlerContext);

  const makeRequest = (integrationId = 'int_1') =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: APPROVE_PATH,
      params: { integration_id: integrationId },
      body: { version: '1.0.0', categories: ['security'] },
      headers: { 'x-session-id': '550e8400-e29b-41d4-a716-446655440000' },
    });

  const makeResponse = () => httpServerMock.createResponseFactory();

  it('does not call reportTelemetryEvent on approve', async () => {
    getAllDataStreams.mockResolvedValue([{ title: 'DS One' }, { title: 'DS Two' }]);

    const handler = getVersionedRouteHandler(router, 'post', APPROVE_PATH);
    const response = makeResponse();
    await handler(makeContext(), makeRequest(), response);

    expect(approveIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationId: 'int_1',
        version: '1.0.0',
        categories: ['security'],
      })
    );
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

describe('downloadIntegrationRoute telemetry', () => {
  const DOWNLOAD_PATH = '/api/automatic_import/integrations/{integration_id}/download';

  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let logger: ReturnType<typeof loggerMock.create>;
  let reportTelemetryEvent: jest.Mock;
  let buildIntegrationPackage: jest.Mock;
  let getIntegrationById: jest.Mock;
  let getAllDataStreams: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    logger = loggerMock.create();

    reportTelemetryEvent = jest.fn();
    buildIntegrationPackage = jest
      .fn()
      .mockResolvedValue({ buffer: Buffer.alloc(0), packageName: 'my-package' });
    getIntegrationById = jest.fn().mockResolvedValue({ title: 'My Integration', version: '1.0.0' });
    getAllDataStreams = jest.fn().mockResolvedValue([{ title: 'DS One' }, { title: 'DS Two' }]);

    registerIntegrationRoutes(
      router as unknown as IRouter<AutomaticImportPluginRequestHandlerContext>,
      logger
    );
  });

  const makeContext = (): AutomaticImportPluginRequestHandlerContext =>
    ({
      automaticImport: Promise.resolve({
        automaticImportService: {
          buildIntegrationPackage,
          getIntegrationById,
          getAllDataStreams,
        },
        reportTelemetryEvent,
        fieldsMetadataClient: {},
        isAvailable: () => true,
      }),
    } as unknown as AutomaticImportPluginRequestHandlerContext);

  const makeRequest = (intent?: (typeof DownloadIntentEnum)[keyof typeof DownloadIntentEnum]) =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: DOWNLOAD_PATH,
      params: { integration_id: 'int-1' },
      query: intent ? { intent } : {},
      headers: { 'x-session-id': 'sess-abc' },
    });

  const makeResponse = () => httpServerMock.createResponseFactory();

  it('fires IntegrationInstalled telemetry once per data stream when intent=install', async () => {
    const handler = getVersionedRouteHandler(router, 'get', DOWNLOAD_PATH);
    const response = makeResponse();
    await handler(makeContext(), makeRequest(DownloadIntentEnum.install), response);

    expect(response.ok).toHaveBeenCalled();
    expect(reportTelemetryEvent).toHaveBeenCalledTimes(2);
    expect(reportTelemetryEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.IntegrationInstalled,
      expect.objectContaining({
        sessionId: 'sess-abc',
        integrationName: 'My Integration',
        version: '1.0.0',
        dataStreamCount: 2,
        dataStreamName: 'DS One',
      })
    );
    expect(reportTelemetryEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.IntegrationInstalled,
      expect.objectContaining({
        dataStreamName: 'DS Two',
      })
    );
  });

  it('does not fire telemetry when intent=download', async () => {
    const handler = getVersionedRouteHandler(router, 'get', DOWNLOAD_PATH);
    const response = makeResponse();
    await handler(makeContext(), makeRequest(DownloadIntentEnum.download), response);

    expect(response.ok).toHaveBeenCalled();
    expect(reportTelemetryEvent).not.toHaveBeenCalled();
  });

  it('does not fire telemetry when no intent is provided', async () => {
    const handler = getVersionedRouteHandler(router, 'get', DOWNLOAD_PATH);
    const response = makeResponse();
    await handler(makeContext(), makeRequest(), response);

    expect(response.ok).toHaveBeenCalled();
    expect(reportTelemetryEvent).not.toHaveBeenCalled();
  });

  it('still returns 200 even when telemetry fetch fails', async () => {
    getIntegrationById.mockRejectedValue(new Error('not found'));

    const handler = getVersionedRouteHandler(router, 'get', DOWNLOAD_PATH);
    const response = makeResponse();
    await handler(makeContext(), makeRequest(DownloadIntentEnum.install), response);

    expect(response.ok).toHaveBeenCalled();
    expect(reportTelemetryEvent).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to report install telemetry')
    );
  });
});
