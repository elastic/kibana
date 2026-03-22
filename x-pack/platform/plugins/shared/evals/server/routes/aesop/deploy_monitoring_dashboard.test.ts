/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerDeployMonitoringDashboardRoute } from './deploy_monitoring_dashboard';
import type { IRouter } from '@kbn/core/server';
import type { EvalsRequestHandlerContext } from '../../types';

describe('registerDeployMonitoringDashboardRoute', () => {
  let mockRouter: jest.Mocked<IRouter<EvalsRequestHandlerContext>>;
  let mockVersionedRouter: any;
  let routeHandler: any;

  beforeEach(() => {
    mockVersionedRouter = {
      addVersion: jest.fn(),
    };

    mockRouter = {
      versioned: {
        post: jest.fn().mockReturnValue(mockVersionedRouter),
      },
    } as unknown as jest.Mocked<IRouter<EvalsRequestHandlerContext>>;

    registerDeployMonitoringDashboardRoute(mockRouter);

    expect(mockRouter.versioned.post).toHaveBeenCalledWith({
      path: '/internal/aesop/monitoring/dashboard/deploy',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['evals'],
        },
      },
      options: {
        tags: ['access:evals'],
      },
    });

    routeHandler = mockVersionedRouter.addVersion.mock.calls[0][1];
  });

  it('should deploy dashboard successfully', async () => {
    const mockContext = {
      resolve: jest.fn().mockResolvedValue({
        core: {
          savedObjects: {
            client: {
              create: jest.fn().mockResolvedValue({
                type: 'dashboard',
                id: 'aesop-performance-monitoring',
                attributes: {},
                references: [],
              }),
            },
          },
        },
        logger: {
          info: jest.fn(),
          debug: jest.fn(),
          error: jest.fn(),
        },
      }),
    };

    const mockRequest = {};
    const mockResponse = {
      ok: jest.fn().mockReturnValue({ status: 200 }),
      customError: jest.fn(),
    };

    await routeHandler(mockContext, mockRequest, mockResponse);

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

    const mockContext = {
      resolve: jest.fn().mockResolvedValue({
        core: {
          savedObjects: {
            client: {
              create: jest.fn().mockRejectedValue(error),
            },
          },
        },
        logger: {
          info: jest.fn(),
          debug: jest.fn(),
          error: jest.fn(),
        },
      }),
    };

    const mockRequest = {};
    const mockResponse = {
      ok: jest.fn(),
      customError: jest.fn().mockReturnValue({ status: 500 }),
    };

    await routeHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Failed to deploy dashboard: Failed to create dashboard',
      },
    });
  });

  it('should log deployment success', async () => {
    const mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };

    const mockContext = {
      resolve: jest.fn().mockResolvedValue({
        core: {
          savedObjects: {
            client: {
              create: jest.fn().mockResolvedValue({
                type: 'dashboard',
                id: 'aesop-performance-monitoring',
                attributes: {},
                references: [],
              }),
            },
          },
        },
        logger: mockLogger,
      }),
    };

    const mockRequest = {};
    const mockResponse = {
      ok: jest.fn().mockReturnValue({ status: 200 }),
      customError: jest.fn(),
    };

    await routeHandler(mockContext, mockRequest, mockResponse);

    expect(mockLogger.info).toHaveBeenCalledWith('[AESOP] Deploying performance monitoring dashboard');
    expect(mockLogger.info).toHaveBeenCalledWith('[AESOP] ✅ Dashboard deployed successfully', {
      dashboard_id: 'aesop-performance-monitoring',
      url: '/app/dashboards#/view/aesop-performance-monitoring',
    });
  });
});
