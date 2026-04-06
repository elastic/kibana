/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerDeployMonitoringDashboardRoute } from './deploy_monitoring_dashboard';

describe('registerDeployMonitoringDashboardRoute', () => {
  let mockRouter: any;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockSavedObjectsClient: any;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let routeHandler: Function;

  const createMockContext = () =>
    ({
      core: Promise.resolve({
        savedObjects: {
          client: mockSavedObjectsClient,
        },
      }),
    } as any);

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = loggingSystemMock.createLogger();
    mockResponse = httpServerMock.createResponseFactory();

    mockSavedObjectsClient = {
      create: jest.fn().mockResolvedValue({
        type: 'dashboard',
        id: 'aesop-performance-monitoring',
        attributes: {},
        references: [],
      }),
    };

    mockRouter = {
      versioned: {
        post: jest.fn().mockReturnValue({
          addVersion: jest.fn((_config: any, handler: Function) => {
            routeHandler = handler;
          }),
        }),
      },
    } as any;

    registerDeployMonitoringDashboardRoute({ router: mockRouter, logger: mockLogger });
  });

  it('registers the route with correct path and access', () => {
    expect(mockRouter.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/internal/aesop/monitoring/dashboard/deploy',
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['evals'],
          },
        },
      })
    );
  });

  it('should deploy dashboard successfully', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({});

    await routeHandler(createMockContext(), mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        success: true,
        dashboard_id: 'aesop-performance-monitoring',
        url: '/app/dashboards#/view/aesop-performance-monitoring',
        message:
          'Dashboard deployed successfully. Visit /app/dashboards#/view/aesop-performance-monitoring to view metrics.',
      },
    });
  });

  it('should handle deployment errors', async () => {
    const error = new Error('Failed to create dashboard');
    mockSavedObjectsClient.create.mockRejectedValue(error);

    const mockRequest = httpServerMock.createKibanaRequest({});

    await routeHandler(createMockContext(), mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Failed to deploy dashboard: Failed to create dashboard',
      },
    });
  });

  it('should log deployment success', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({});

    await routeHandler(createMockContext(), mockRequest, mockResponse);

    expect(mockLogger.info).toHaveBeenCalledWith(
      '[AESOP] Deploying performance monitoring dashboard'
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      '[AESOP] Dashboard deployed successfully dashboard_id=aesop-performance-monitoring url=/app/dashboards#/view/aesop-performance-monitoring'
    );
  });
});
