/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { InvestigationAttachmentInvalidRequestError } from '../../investigation_attachments/errors';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../../investigations/constants';
import type { ImpactMapService } from '../services/impact_map_service';
import { registerSetImpactMapRoute } from './set_impact_map_route';

type Handler = (
  context: unknown,
  request: ReturnType<typeof httpServerMock.createKibanaRequest>,
  response: ReturnType<typeof httpServerMock.createResponseFactory>
) => Promise<unknown>;

const setup = (setWithPublicClient: jest.Mock) => {
  const router = httpServiceMock.createRouter();
  let registered: { config: { security?: unknown }; handler: Handler } | undefined;
  (router.versioned.put as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => {
      registered = { config, handler };
    },
  }));
  registerSetImpactMapRoute({
    router,
    logger: loggingSystemMock.createLogger(),
    getImpactMapService: () => ({ setWithPublicClient } as unknown as ImpactMapService),
    getSpaceId: () => 'space-1',
    resolveUser: async () => ({ username: 'analyst', fullName: null, email: null }),
    getAttachmentClient: async () => ({} as never),
    getConversationClient: async () => ({} as never),
  });
  if (!registered) throw new Error('Expected the route to register');
  return registered;
};

const body = {
  entities: [{ id: 'checkout', type_id: 'service', label: 'checkout' }],
  relationships: [],
};

describe('set impact map route', () => {
  it('needs the manage privilege and writes the map for the investigation in the path', async () => {
    const setWithPublicClient = jest.fn().mockResolvedValue({ warnings: ['made up a type'] });
    const { config, handler } = setup(setWithPublicClient);
    const response = httpServerMock.createResponseFactory();

    await handler(
      {},
      httpServerMock.createKibanaRequest({ params: { id: 'conv-1' }, body }),
      response
    );

    expect(config.security).toEqual({
      authz: { requiredPrivileges: [INVESTIGATIONS_API_PRIVILEGE_MANAGE] },
    });
    expect(setWithPublicClient).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-1', spaceId: 'space-1', input: body })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: { acknowledged: true, warnings: ['made up a type'] },
    });
  });

  it('answers 400 for a map the store rejects', async () => {
    const setWithPublicClient = jest
      .fn()
      .mockRejectedValue(new InvestigationAttachmentInvalidRequestError('Unknown entity'));
    const { handler } = setup(setWithPublicClient);
    const response = httpServerMock.createResponseFactory();

    await handler(
      {},
      httpServerMock.createKibanaRequest({ params: { id: 'conv-1' }, body }),
      response
    );

    expect(response.badRequest).toHaveBeenCalledWith({ body: { message: 'Unknown entity' } });
  });
});
