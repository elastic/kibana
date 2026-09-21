/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { IMPACT_INTERNAL_URL } from '../../../common/impact/constants';
import { IMPACT_API_PRIVILEGE_MANAGE, IMPACT_API_PRIVILEGE_READ } from '../constants';
import { ImpactInvalidRequestError, ImpactNotFoundError } from '../services/errors';
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

const registerAndCollect = (
  service: Partial<ImpactService>,
  getAttachmentClient: ImpactRouteDependencies['getAttachmentClient'] = async () => undefined
) => {
  const router = httpServiceMock.createRouter();
  const posts: RegisteredRoute[] = [];
  const gets: RegisteredRoute[] = [];

  (router.versioned.post as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => posts.push({ config, handler }),
  }));
  (router.versioned.get as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => gets.push({ config, handler }),
  }));

  registerImpactRoutes({
    router,
    logger: loggingSystemMock.createLogger(),
    getImpactService: () => service as ImpactService,
    getSpaceId: () => 'default',
    resolveUser: async () => ANALYST,
    getAttachmentClient,
  } as ImpactRouteDependencies);

  return { posts, gets };
};

describe('investigation impact routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gates attach on manage and get on read', () => {
    const { posts, gets } = registerAndCollect({});

    expect(posts).toHaveLength(1);
    expect(gets).toHaveLength(1);
    expect(posts[0].config.path).toBe(IMPACT_INTERNAL_URL);
    expect(posts[0].config.security?.authz?.requiredPrivileges).toEqual([
      IMPACT_API_PRIVILEGE_MANAGE,
    ]);
    expect(gets[0].config.path).toBe(IMPACT_INTERNAL_URL);
    expect(gets[0].config.security?.authz?.requiredPrivileges).toEqual([IMPACT_API_PRIVILEGE_READ]);
  });

  it('attaches through the service with the space and the resolved user, never a body actor', async () => {
    const attach = jest.fn().mockResolvedValue({ id: 'impact-1', entityIds: ['user-1'] });
    const { posts } = registerAndCollect({ attach });
    const response = httpServerMock.createResponseFactory();

    await posts[0].handler(
      {},
      httpServerMock.createKibanaRequest({
        body: { conversationId: 'conv-1', entityIds: ['user-1'] },
      }),
      response
    );

    expect(attach).toHaveBeenCalledWith(
      { conversationId: 'conv-1', entityIds: ['user-1'] },
      { spaceId: 'default', user: ANALYST }
    );
    expect(response.ok).toHaveBeenCalled();
  });

  it('stamps a by-reference attachment onto the conversation after writing', async () => {
    const impact = { id: 'impact-1', conversationId: 'conv-1', entityIds: ['user-1'] };
    const attach = jest.fn().mockResolvedValue(impact);
    const create = jest.fn().mockResolvedValue({ id: 'impact-1' });
    const { posts } = registerAndCollect({ attach }, async () => ({ create } as never));
    const response = httpServerMock.createResponseFactory();

    await posts[0].handler(
      {},
      httpServerMock.createKibanaRequest({
        body: { conversationId: 'conv-1', entityIds: ['user-1'] },
      }),
      response
    );

    expect(create).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      id: 'impact-1',
      type: 'investigation_impact',
      origin: 'impact-1',
    });
    expect(response.ok).toHaveBeenCalledWith({ body: impact });
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
        body: { conversationId: 'conv-1', entityIds: ['user-1'] },
      }),
      response
    );

    expect(response.badRequest).toHaveBeenCalled();
  });
});
