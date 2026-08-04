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
import { listDirectoryRoute } from './list_directory_route';
import { createActionHandler } from '../../handlers';

jest.mock('../../handlers', () => ({
  createActionHandler: jest.fn(),
}));

jest.mock('../../lib/get_user_info', () => ({
  getUserInfo: jest.fn().mockResolvedValue({ username: 'tester', profile_uid: 'uid-1' }),
}));

const createActionHandlerMock = createActionHandler as jest.Mock;

const TEST_PATH = '/internal/osquery/file_system/list';

describe('listDirectoryRoute injection boundary', () => {
  let routeHandler: RequestHandler;

  const setupRoute = () => {
    const httpService = httpServiceMock.createSetupContract();
    const mockRouter = httpService.createRouter();
    const mockContext = {
      logFactory: { get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()) },
      experimentalFeatures: { fileSystemViewer: true },
      getStartServices: jest.fn().mockResolvedValue([{}, { security: {} }]),
      service: { getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }) },
    } as unknown as OsqueryAppContext;

    listDirectoryRoute(mockRouter, mockContext);

    const route = mockRouter.versioned.getRoute('post', TEST_PATH);
    routeHandler = route.versions[API_VERSIONS.internal.v1].handler;
  };

  const makeCoreContext = () => ({
    core: Promise.resolve({
      security: {
        audit: { logger: { log: jest.fn(), enabled: true, includeSavedObjectNames: false } },
      },
    }),
  });

  const dispatchPath = async (path: string) => {
    const request = httpServerMock.createKibanaRequest({ body: { agentId: 'agent-1', path } });
    const response = httpServerMock.createResponseFactory();
    await routeHandler(makeCoreContext() as never, request, response);

    // The query is the second positional arg to createActionHandler: (ctx, body, options).
    return createActionHandlerMock.mock.calls[0][1].query as string;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createActionHandlerMock.mockResolvedValue({
      response: { action_id: 'a1' },
      fleetActionsCount: 1,
    });
    setupRoute();
  });

  it('escapes a benign path into a single, balanced literal', async () => {
    const query = await dispatchPath('/etc');
    expect(query).toBe(
      "SELECT path, filename, size, mtime, type FROM file WHERE directory = '/etc'"
    );
  });

  it('neutralizes a statement-terminating injection so the query is not altered', async () => {
    const query = await dispatchPath("/tmp'; DROP TABLE file; --");
    expect(query).toBe(
      "SELECT path, filename, size, mtime, type FROM file WHERE directory = '/tmp''; DROP TABLE file; --'"
    );
    // Exactly one WHERE clause survives — the payload did not open a second statement.
    expect(query.match(/WHERE/g)).toHaveLength(1);
    expect(query).not.toMatch(/DROP TABLE file;\s*--\s*$/);
  });

  it('neutralizes a boolean-based injection', async () => {
    const query = await dispatchPath("' OR '1'='1");
    expect(query).toBe(
      "SELECT path, filename, size, mtime, type FROM file WHERE directory = ''' OR ''1''=''1'"
    );
  });

  it('keeps a quote-and-semicolon DELETE payload inert', async () => {
    const query = await dispatchPath("/tmp'; DELETE FROM file WHERE '1'='1");
    // The entire payload — including its own DELETE/WHERE words — is trapped
    // inside one escaped literal; no unescaped quote terminates it early.
    expect(query).toBe(
      "SELECT path, filename, size, mtime, type FROM file WHERE directory = '/tmp''; DELETE FROM file WHERE ''1''=''1'"
    );
    // The query still starts with the single intended SELECT ... WHERE directory clause.
    expect(
      query.startsWith('SELECT path, filename, size, mtime, type FROM file WHERE directory = ')
    ).toBe(true);
  });
});
