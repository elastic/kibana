/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { auditRetrieveRoute } from './audit_retrieve_route';
import { OsqueryAuditAction } from '../../lib/audit';

const TEST_PATH = '/internal/osquery/file_system/audit_retrieve';

describe('auditRetrieveRoute', () => {
  let routeHandler: RequestHandler;
  let mockAuditLog: jest.Mock;

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  const setupRoute = () => {
    const mockRouter = createMockRouter();
    const mockContext: OsqueryAppContext = {
      logFactory: {
        get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()),
      },
      experimentalFeatures: { fileSystemViewer: true } as OsqueryAppContext['experimentalFeatures'],
    } as unknown as OsqueryAppContext;

    auditRetrieveRoute(mockRouter, mockContext);

    const route = mockRouter.versioned.getRoute('post', TEST_PATH);
    const routeVersion = route.versions[API_VERSIONS.internal.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.internal.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  const makeMockContext = (auditLogFn: jest.Mock) => ({
    core: Promise.resolve({
      security: {
        audit: {
          logger: {
            log: auditLogFn,
            enabled: true,
            includeSavedObjectNames: false,
          },
        },
      },
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditLog = jest.fn();
    setupRoute();
  });

  it('emits a FILE_RETRIEVE audit event for get_file action type', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        agentId: 'agent-abc',
        endpointId: 'ep-xyz',
        path: '/etc/passwd',
        actionType: 'get_file',
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const ctx = makeMockContext(mockAuditLog);

    await routeHandler(ctx as never, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({ body: { acknowledged: true } });
    expect(mockAuditLog).toHaveBeenCalledTimes(1);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: OsqueryAuditAction.FILE_RETRIEVE,
          outcome: 'success',
        }),
        labels: expect.objectContaining({
          agent_id: 'agent-abc',
          path: '/etc/passwd',
        }),
      })
    );
  });

  it('emits a FILE_RETRIEVE audit event for run_script action type', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        agentId: 'agent-abc',
        endpointId: 'ep-xyz',
        path: '/tmp/script.sh',
        actionType: 'run_script',
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const ctx = makeMockContext(mockAuditLog);

    await routeHandler(ctx as never, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({ body: { acknowledged: true } });
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: OsqueryAuditAction.FILE_RETRIEVE,
        }),
        labels: expect.objectContaining({
          path: '/tmp/script.sh',
        }),
      })
    );
  });

  it('includes the action type in the audit message', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        agentId: 'agent-abc',
        endpointId: 'ep-xyz',
        path: '/etc/shadow',
        actionType: 'get_file',
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const ctx = makeMockContext(mockAuditLog);

    await routeHandler(ctx as never, mockRequest, mockResponse);

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('get_file'),
      })
    );
  });

  it('returns 200 with acknowledged:true', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        agentId: 'agent-1',
        endpointId: 'ep-1',
        path: '/var/log/syslog',
        actionType: 'get_file',
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const ctx = makeMockContext(mockAuditLog);

    await routeHandler(ctx as never, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({ body: { acknowledged: true } });
  });
});
