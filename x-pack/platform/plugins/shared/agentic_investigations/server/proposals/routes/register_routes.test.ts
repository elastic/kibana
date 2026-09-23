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
  ProposalForbiddenError,
  ProposalInvalidActionInputError,
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

  it('should never expose a create route, even indirectly, over HTTP', () => {
    const router = httpServiceMock.createRouter();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: jest.fn() });
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: jest.fn() });

    registerRoutes({
      router,
      logger: loggingSystemMock.createLogger(),
      getProposalsService: () => ({} as ProposalsService),
      getSpaceId: () => 'default',
      resolveUser: async () => ANALYST,
    } as unknown as RouteDependencies);

    expect(router.versioned.put).not.toHaveBeenCalled();
    expect(router.versioned.patch).not.toHaveBeenCalled();
    // And no create route: a decision is written behind the proposal's gate,
    // so one created without a gate execution could never be decided. The
    // `proposals.createProposal` step is the only caller that knows the
    // execution id to stamp.
    expect((router.versioned.post as jest.Mock).mock.calls.map(([{ path }]) => path)).not.toContain(
      PROPOSALS_INTERNAL_URL
    );
  });

  it('should release the gate with the submitted action input and the rationale', async () => {
    const releaseGate = jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'pending' });
    const { posts, byPath } = registerAndCollect({ releaseGate });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/approve').handler(
      {},
      httpServerMock.createKibanaRequest({
        params: { id: 'proposal-1' },
        body: {
          actionInput: { name: 'Suspicious PowerShell' },
          rationale: 'Matches the playbook',
          decidedBy: 'someone-else',
        },
      }),
      response
    );

    // One call, so the service can order the refusals ahead of the annotation
    // rather than the route orchestrating two writes.
    expect(releaseGate).toHaveBeenCalledTimes(1);
    expect(releaseGate).toHaveBeenCalledWith('proposal-1', {
      approved: true,
      actionInput: { name: 'Suspicious PowerShell' },
      rationale: 'Matches the playbook',
      spaceId: 'default',
      request: expect.anything(),
    });
    expect(response.ok).toHaveBeenCalled();
  });

  it('should never pass a caller-supplied decider through to the service', async () => {
    const releaseGate = jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'pending' });
    const { posts, byPath } = registerAndCollect({ releaseGate });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/approve').handler(
      {},
      httpServerMock.createKibanaRequest({
        params: { id: 'proposal-1' },
        body: { decidedBy: 'someone-else' },
      }),
      response
    );

    // The decision and its actor are written behind the gate, so a body field
    // can never reach the record.
    expect(releaseGate.mock.calls[0][1]).not.toHaveProperty('decidedBy');
  });

  it('should map a conflicting decision to 409', async () => {
    const releaseGate = jest.fn().mockRejectedValue(new ProposalConflictError('already decided'));
    const { posts, byPath } = registerAndCollect({ releaseGate });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/approve').handler(
      {},
      httpServerMock.createKibanaRequest({ params: { id: 'proposal-1' }, body: {} }),
      response
    );

    expect(response.conflict).toHaveBeenCalled();
  });

  it('should map an expired proposal to 410', async () => {
    const releaseGate = jest.fn().mockRejectedValue(new ProposalExpiredError('proposal-1'));
    const { posts, byPath } = registerAndCollect({ releaseGate });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/approve').handler(
      {},
      httpServerMock.createKibanaRequest({ params: { id: 'proposal-1' }, body: {} }),
      response
    );

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 410 }));
  });

  it('should map a missing privilege to 403', async () => {
    const releaseGate = jest.fn().mockRejectedValue(new ProposalForbiddenError('no privilege'));
    const { posts, byPath } = registerAndCollect({ releaseGate });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/approve').handler(
      {},
      httpServerMock.createKibanaRequest({ params: { id: 'proposal-1' }, body: {} }),
      response
    );

    expect(response.forbidden).toHaveBeenCalled();
  });

  it('should gate revisions on the manage privilege, since revising writes without a gate', () => {
    const { posts, byPath } = registerAndCollect({});

    expect(byPath(posts, '/revisions').config.security?.authz?.requiredPrivileges).toEqual([
      PROPOSALS_API_PRIVILEGE_MANAGE,
    ]);
  });

  it('should pass the params id and body overrides straight through to revise()', async () => {
    const revise = jest.fn().mockResolvedValue({ proposalId: 'proposal-2', revision: 2 });
    const { posts, byPath } = registerAndCollect({ revise });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/revisions').handler(
      {},
      httpServerMock.createKibanaRequest({
        params: { proposalId: 'proposal-1' },
        body: { comment: 'Tightened the match', confidence: 'high' },
      }),
      response
    );

    expect(revise).toHaveBeenCalledWith(
      { id: 'proposal-1', comment: 'Tightened the match', confidence: 'high' },
      'default'
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: { proposalId: 'proposal-2', revision: 2, status: 'pending' },
    });
  });

  it('should map a conflicting revision (already superseded or decided) to 409', async () => {
    const revise = jest.fn().mockRejectedValue(new ProposalConflictError('already superseded'));
    const { posts, byPath } = registerAndCollect({ revise });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/revisions').handler(
      {},
      httpServerMock.createKibanaRequest({ params: { proposalId: 'proposal-1' }, body: {} }),
      response
    );

    expect(response.conflict).toHaveBeenCalled();
  });

  it('should map revising an expired proposal to 410', async () => {
    const revise = jest.fn().mockRejectedValue(new ProposalExpiredError('proposal-1'));
    const { posts, byPath } = registerAndCollect({ revise });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/revisions').handler(
      {},
      httpServerMock.createKibanaRequest({ params: { proposalId: 'proposal-1' }, body: {} }),
      response
    );

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 410 }));
  });

  it('should map an action input the action can never accept to 400', async () => {
    const revise = jest
      .fn()
      .mockRejectedValue(new ProposalInvalidActionInputError('missing required field: ruleId'));
    const { posts, byPath } = registerAndCollect({ revise });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/revisions').handler(
      {},
      httpServerMock.createKibanaRequest({
        params: { proposalId: 'proposal-1' },
        body: { actionInput: { threshold: 5 } },
      }),
      response
    );

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'missing required field: ruleId' },
    });
  });

  it('should map revising a missing proposal to 404', async () => {
    const revise = jest.fn().mockRejectedValue(new ProposalNotFoundError('proposal-1'));
    const { posts, byPath } = registerAndCollect({ revise });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/revisions').handler(
      {},
      httpServerMock.createKibanaRequest({ params: { proposalId: 'proposal-1' }, body: {} }),
      response
    );

    expect(response.notFound).toHaveBeenCalled();
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

  it('should hand the dismiss reason to the gate release, which the gate itself discards', async () => {
    const releaseGate = jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'pending' });
    const { posts, byPath } = registerAndCollect({ releaseGate });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/dismiss').handler(
      {},
      httpServerMock.createKibanaRequest({
        params: { id: 'proposal-1' },
        body: { dismissReason: 'duplicate', rationale: 'Same as yesterday' },
      }),
      response
    );

    // The reason is why this route writes at all: `waitForApproval` reduces
    // its resume payload to a boolean and would drop it.
    expect(releaseGate).toHaveBeenCalledWith('proposal-1', {
      approved: false,
      dismissReason: 'duplicate',
      rationale: 'Same as yesterday',
      spaceId: 'default',
      request: expect.anything(),
    });
  });

  it('should return a record that is still undecided, since the write is asynchronous', async () => {
    const releaseGate = jest
      .fn()
      .mockResolvedValue({ id: 'proposal-1', status: 'pending', decision: undefined });
    const { posts, byPath } = registerAndCollect({ releaseGate });
    const response = httpServerMock.createResponseFactory();

    await byPath(posts, '/dismiss').handler(
      {},
      httpServerMock.createKibanaRequest({
        params: { id: 'proposal-1' },
        body: { dismissReason: 'duplicate' },
      }),
      response
    );

    // The resume returns before the post-gate steps run, so a UI must refetch
    // rather than trust this body.
    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({ decision: undefined }),
    });
  });
});
