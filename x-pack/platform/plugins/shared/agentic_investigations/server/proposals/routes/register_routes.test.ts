/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { PROPOSALS_INTERNAL_URL } from '../../../common/proposals/constants';
import { PROPOSALS_API_PRIVILEGE_MANAGE, PROPOSALS_API_PRIVILEGE_READ } from '../constants';
import type { ProposalsService } from '../services/proposals_service';
import {
  ProposalConflictError,
  ProposalExpiredError,
  ProposalNotFoundError,
} from '../services/errors';
import type { RouteDependencies } from '../types';
import { registerRoutes } from './register_routes';

type Handler = (
  context: unknown,
  request: ReturnType<typeof httpServerMock.createKibanaRequest>,
  response: ReturnType<typeof httpServerMock.createResponseFactory>
) => Promise<unknown>;

interface RegisteredRoute {
  config: { path: string; security?: { authz?: { requiredPrivileges?: string[] } } };
  handler: Handler;
}

/** The resolved actor; the route must never take it from the request body. */
const ANALYST = {
  username: 'analyst',
  fullName: 'An Analyst',
  email: null,
  profileUid: 'analyst-uid',
};

const registerAndCollect = (service: Partial<ProposalsService>) => {
  const router = httpServiceMock.createRouter();
  const posts: RegisteredRoute[] = [];
  const gets: RegisteredRoute[] = [];

  (router.versioned.post as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => posts.push({ config, handler }),
  }));
  (router.versioned.get as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => gets.push({ config, handler }),
  }));

  registerRoutes({
    router,
    logger: loggingSystemMock.createLogger(),
    getProposalsService: () => service as ProposalsService,
    getSpaceId: () => 'default',
    resolveUser: async () => ANALYST,
  } as unknown as RouteDependencies);

  const byPath = (routes: RegisteredRoute[], suffix: string) =>
    routes.find(({ config }) => config.path.endsWith(suffix))!;

  return { posts, gets, byPath };
};

describe('investigation proposals routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should gate reads on the read privilege and decisions on the manage privilege', () => {
    const { posts, gets, byPath } = registerAndCollect({});

    expect(byPath(gets, PROPOSALS_INTERNAL_URL).config.security?.authz?.requiredPrivileges).toEqual(
      [PROPOSALS_API_PRIVILEGE_READ]
    );
    // Dismissal releases the waiting worker, so it is not a lesser operation.
    for (const suffix of ['/approve', '/dismiss']) {
      expect(byPath(posts, suffix).config.security?.authz?.requiredPrivileges).toEqual([
        PROPOSALS_API_PRIVILEGE_MANAGE,
      ]);
    }
  });

  it('should not register an update route', () => {
    const router = httpServiceMock.createRouter();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: jest.fn() });
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: jest.fn() });

    registerRoutes({
      router,
      logger: loggingSystemMock.createLogger(),
      getProposalsService: () => ({}) as ProposalsService,
      getSpaceId: () => 'default',
      resolveUser: async () => ANALYST,
    } as unknown as RouteDependencies);

    expect(router.versioned.put).not.toHaveBeenCalled();
    expect(router.versioned.patch).not.toHaveBeenCalled();
  });

  it('should pass the server-derived actor to approve rather than trusting the body', async () => {
    const approve = jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'approved' });
    const { posts, byPath } = registerAndCollect({ approve });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/approve').handler(
      {},
      httpServerMock.createKibanaRequest({
        params: { id: 'proposal-1' },
        body: { actionInput: { name: 'Suspicious PowerShell' }, decidedBy: 'someone-else' },
      }),
      response
    );

    expect(approve).toHaveBeenCalledWith(
      'proposal-1',
      expect.objectContaining({ actionInput: { name: 'Suspicious PowerShell' } }),
      expect.objectContaining({ user: ANALYST, spaceId: 'default' })
    );
    expect(response.ok).toHaveBeenCalled();
  });

  it('should map a conflicting decision to 409', async () => {
    const approve = jest.fn().mockRejectedValue(new ProposalConflictError('already decided'));
    const { posts, byPath } = registerAndCollect({ approve });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/approve').handler(
      {},
      httpServerMock.createKibanaRequest({ params: { id: 'proposal-1' }, body: {} }),
      response
    );

    expect(response.conflict).toHaveBeenCalled();
  });

  it('should map an expired proposal to 410', async () => {
    const approve = jest.fn().mockRejectedValue(new ProposalExpiredError('proposal-1'));
    const { posts, byPath } = registerAndCollect({ approve });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/approve').handler(
      {},
      httpServerMock.createKibanaRequest({ params: { id: 'proposal-1' }, body: {} }),
      response
    );

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 410 }));
  });

  it('should map a missing proposal to 404', async () => {
    const get = jest.fn().mockRejectedValue(new ProposalNotFoundError('missing'));
    const { gets, byPath } = registerAndCollect({ get });
    const response = httpServerMock.createResponseFactory();

    await byPath(gets, '/{id}').handler(
      {},
      httpServerMock.createKibanaRequest({ params: { id: 'missing' } }),
      response
    );

    expect(response.notFound).toHaveBeenCalled();
  });

  it('should pass the structured dismiss reason through to the service', async () => {
    const dismiss = jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'dismissed' });
    const { posts, byPath } = registerAndCollect({ dismiss });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/dismiss').handler(
      {},
      httpServerMock.createKibanaRequest({
        params: { id: 'proposal-1' },
        body: { dismissReason: 'duplicate', rationale: 'Same as yesterday' },
      }),
      response
    );

    expect(dismiss).toHaveBeenCalledWith(
      'proposal-1',
      { dismissReason: 'duplicate', rationale: 'Same as yesterday' },
      expect.anything()
    );
  });
});
