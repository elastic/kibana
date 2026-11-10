/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { createConversationNotFoundError } from '@kbn/agent-builder-common';
import {
  IMPACT_ESCALATION_SUMMARY_URL,
  IMPACT_INTERNAL_URL,
  IMPACT_PROPOSAL_SUMMARY_URL,
} from '../../../common/impact/constants';
import { ESCALATIONS_API_PRIVILEGE_READ } from '../../escalations/constants';
import type { ImpactPillsService } from '../services/impact_pills_service';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../../investigations/constants';
import {
  ImpactConflictError,
  ImpactInvalidRequestError,
  ImpactNotFoundError,
} from '../services/errors';
import type { ImpactService } from '../services/impact_service';
import type { ImpactRouteDependencies } from '../types';
import { registerImpactRoutes } from './register_routes';

type Handler = (
  context: unknown,
  request: ReturnType<typeof httpServerMock.createKibanaRequest>,
  response: ReturnType<typeof httpServerMock.createResponseFactory>
) => Promise<unknown>;

interface RegisteredRoute {
  config: { path: string; security?: { authz?: { requiredPrivileges?: string[] } } };
  handler: Handler;
}

const ANALYST = {
  username: 'analyst',
  fullName: 'An Analyst',
  email: null,
  profileUid: 'analyst-uid',
};

const ownerConversation = {
  get: jest.fn().mockResolvedValue({
    permissions: { update_access_control: true, rename: true, delete: true },
  }),
};

/** The stamp reads back the document `attach` indexed. */
const impactReadsAfterAttach = (attach: jest.Mock) =>
  jest.fn(async () => {
    const attached = [...attach.mock.results].reverse().find((entry) => entry.type === 'return');
    if (!attached) {
      throw new ImpactNotFoundError('conv-1');
    }
    const result = await attached.value;
    return result.written;
  });

const registerAndCollect = (
  service: Partial<ImpactService>,
  getAttachmentClient: ImpactRouteDependencies['getAttachmentClient'] = async () =>
    ({
      create: jest.fn().mockResolvedValue({ id: 'impact-1' }),
      update: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    } as never),
  getConversationClient: ImpactRouteDependencies['getConversationClient'] = async () =>
    ownerConversation as never,
  {
    pills = {},
    escalationsEnabled = false,
  }: { pills?: Partial<ImpactPillsService>; escalationsEnabled?: boolean } = {}
) => {
  const router = httpServiceMock.createRouter();
  const posts: RegisteredRoute[] = [];
  const gets: RegisteredRoute[] = [];
  const attach = (service.attach ?? jest.fn()) as jest.Mock;

  (router.versioned.post as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => posts.push({ config, handler }),
  }));
  (router.versioned.get as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => gets.push({ config, handler }),
  }));

  registerImpactRoutes({
    router,
    logger: loggingSystemMock.createLogger(),
    getImpactService: () =>
      ({
        revertAttach: jest.fn().mockResolvedValue(undefined),
        ...service,
        attach,
        getByConversationId: service.getByConversationId ?? impactReadsAfterAttach(attach),
      } as unknown as ImpactService),
    getImpactPillsService: () => pills as ImpactPillsService,
    escalationsEnabled,
    getSpaceId: () => 'default',
    resolveUser: async () => ANALYST,
    getAttachmentClient,
    getConversationClient,
  } as ImpactRouteDependencies);

  return { posts, gets };
};

describe('investigation impact routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gates attach and get on the investigations manage privilege', () => {
    const { posts, gets } = registerAndCollect({});

    expect(posts).toHaveLength(1);
    expect(gets.filter(({ config }) => config.path === IMPACT_INTERNAL_URL)).toHaveLength(1);
    expect(posts[0].config.path).toBe(IMPACT_INTERNAL_URL);
    expect(posts[0].config.security?.authz?.requiredPrivileges).toEqual([
      INVESTIGATIONS_API_PRIVILEGE_MANAGE,
    ]);
    expect(gets[0].config.path).toBe(IMPACT_INTERNAL_URL);
    expect(gets[0].config.security?.authz?.requiredPrivileges).toEqual([
      INVESTIGATIONS_API_PRIVILEGE_MANAGE,
    ]);
  });

  describe('impact pills', () => {
    const findGet = (gets: RegisteredRoute[], path: string) =>
      gets.find(({ config }) => config.path === path);

    it('registers the escalation pills route only when escalations are enabled', () => {
      expect(findGet(registerAndCollect({}).gets, IMPACT_ESCALATION_SUMMARY_URL)).toBeUndefined();

      const route = findGet(
        registerAndCollect({}, undefined, undefined, { escalationsEnabled: true }).gets,
        IMPACT_ESCALATION_SUMMARY_URL
      );

      expect(route?.config.security?.authz?.requiredPrivileges).toEqual([
        ESCALATIONS_API_PRIVILEGE_READ,
      ]);
    });

    it('returns the proposal pills the service builds for the query', async () => {
      const page = { pills: [{ entityId: 'host-1', count: 2 }], total: 1, remaining: 0 };
      const forProposals = jest.fn().mockResolvedValue(page);
      const { gets } = registerAndCollect({}, undefined, undefined, { pills: { forProposals } });
      const response = httpServerMock.createResponseFactory();
      const request = httpServerMock.createKibanaRequest({
        query: {
          origin: 'alertzero',
          categories: ['respond'],
          decidedWithinHours: 72,
          from: 0,
          size: 10,
        },
      });

      await findGet(gets, IMPACT_PROPOSAL_SUMMARY_URL)?.handler({}, request, response);

      expect(forProposals).toHaveBeenCalledWith(request, request.query);
      expect(response.ok).toHaveBeenCalledWith({ body: page });
    });

    it('returns the escalation pills the service builds', async () => {
      const page = { pills: [{ entityId: 'user-1', count: 1 }], total: 1, remaining: 0 };
      const forEscalations = jest.fn().mockResolvedValue(page);
      const { gets } = registerAndCollect({}, undefined, undefined, {
        pills: { forEscalations },
        escalationsEnabled: true,
      });
      const response = httpServerMock.createResponseFactory();
      const request = httpServerMock.createKibanaRequest({ query: { from: 0, size: 10 } });

      await findGet(gets, IMPACT_ESCALATION_SUMMARY_URL)?.handler({}, request, response);

      expect(forEscalations).toHaveBeenCalledWith(request, request.query);
      expect(response.ok).toHaveBeenCalledWith({ body: page });
    });
  });

  it('attaches through the service with the space and the resolved user, never a body actor', async () => {
    const attach = jest.fn().mockResolvedValue({
      written: { id: 'impact-1', conversationId: 'conv-1', entities: [{ id: 'user-1' }] },
    });
    const { posts } = registerAndCollect({ attach });
    const response = httpServerMock.createResponseFactory();

    await posts[0].handler(
      {},
      httpServerMock.createKibanaRequest({
        body: { conversationId: 'conv-1', entities: [{ id: 'user-1' }] },
      }),
      response
    );

    expect(attach).toHaveBeenCalledWith(
      { conversationId: 'conv-1', entities: [{ id: 'user-1' }] },
      { spaceId: 'default', user: ANALYST }
    );
    expect(response.ok).toHaveBeenCalled();
  });

  it('checks conversation owner access before writing, then attaches the impact', async () => {
    const impact = {
      id: 'impact-1',
      conversationId: 'conv-1',
      entities: [{ id: 'user-1' }],
    };
    const attach = jest.fn().mockResolvedValue({ written: impact });
    const create = jest.fn().mockResolvedValue({ id: 'impact-1' });
    const conversations = {
      get: jest.fn().mockResolvedValue({
        permissions: { update_access_control: true },
      }),
    };
    const { posts } = registerAndCollect(
      { attach },
      async () => ({ create } as never),
      async () => conversations as never
    );
    const response = httpServerMock.createResponseFactory();

    await posts[0].handler(
      {},
      httpServerMock.createKibanaRequest({
        body: { conversationId: 'conv-1', entities: [{ id: 'user-1' }] },
      }),
      response
    );

    expect(conversations.get).toHaveBeenCalledWith('conv-1');
    expect(conversations.get.mock.invocationCallOrder[0]).toBeLessThan(
      attach.mock.invocationCallOrder[0]
    );
    expect(create).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      id: 'impact-1',
      type: 'investigation_impact',
      origin: 'impact-1',
      data: impact,
      hidden: true,
    });
    expect(attach.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]);
    expect(response.ok).toHaveBeenCalledWith({ body: impact });
  });

  it('does not write impact when the caller cannot converse with the conversation', async () => {
    const attach = jest.fn();
    // `conversations.get` itself enforces `converse` access and fails closed as not-found;
    // the write path relies on that instead of a separate permission check.
    const { posts } = registerAndCollect(
      { attach },
      async () => ({ create: jest.fn() } as never),
      async () =>
        ({
          get: jest
            .fn()
            .mockRejectedValue(createConversationNotFoundError({ conversationId: 'conv-1' })),
        } as never)
    );
    const response = httpServerMock.createResponseFactory();

    await posts[0].handler(
      {},
      httpServerMock.createKibanaRequest({
        body: { conversationId: 'conv-1', entities: [{ id: 'user-1' }] },
      }),
      response
    );

    expect(attach).not.toHaveBeenCalled();
    expect(response.notFound).toHaveBeenCalled();
  });

  it('does not write impact when Agent Builder clients cannot be resolved', async () => {
    const attach = jest.fn();
    const { posts } = registerAndCollect({ attach }, async () => {
      throw new Error(
        'Agent Builder is not available until the agenticInvestigations plugin has started'
      );
    });
    const response = httpServerMock.createResponseFactory();

    await posts[0].handler(
      {},
      httpServerMock.createKibanaRequest({
        body: { conversationId: 'conv-1', entities: [{ id: 'user-1' }] },
      }),
      response
    );

    expect(attach).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  it('maps a missing impact to 404', async () => {
    const getByConversationId = jest.fn().mockRejectedValue(new ImpactNotFoundError('conv-1'));
    const { gets } = registerAndCollect({ getByConversationId });
    const response = httpServerMock.createResponseFactory();

    await gets[0].handler(
      {},
      httpServerMock.createKibanaRequest({ query: { conversationId: 'conv-1' } }),
      response
    );

    expect(response.notFound).toHaveBeenCalled();
  });

  it('maps an invalid attach to 400', async () => {
    const attach = jest.fn().mockRejectedValue(new ImpactInvalidRequestError('too many'));
    const { posts } = registerAndCollect({ attach });
    const response = httpServerMock.createResponseFactory();

    await posts[0].handler(
      {},
      httpServerMock.createKibanaRequest({
        body: { conversationId: 'conv-1', entities: [{ id: 'user-1' }] },
      }),
      response
    );

    expect(response.badRequest).toHaveBeenCalled();
  });

  it('maps an attach that lost every version check to 409', async () => {
    const attach = jest.fn().mockRejectedValue(new ImpactConflictError('conv-1'));
    const { posts } = registerAndCollect({ attach });
    const response = httpServerMock.createResponseFactory();

    await posts[0].handler(
      {},
      httpServerMock.createKibanaRequest({
        body: { conversationId: 'conv-1', entities: [{ id: 'user-1' }] },
      }),
      response
    );

    expect(response.conflict).toHaveBeenCalled();
  });
});
