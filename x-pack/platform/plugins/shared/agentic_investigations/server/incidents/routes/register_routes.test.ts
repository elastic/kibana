/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import {
  createConversationNotFoundError,
  createConversationWriteConflictError,
} from '@kbn/agent-builder-common';
import { INCIDENTS_INTERNAL_URL, INCIDENT_BY_ID_URL } from '../../../common/incidents/constants';
import { INCIDENTS_API_PRIVILEGE_MANAGE } from '../constants';
import type { IncidentsService } from '../services/incidents_service';
import { InvalidLinkedInvestigationError } from '../services/errors';
import type { IncidentRouteDependencies } from '../types';
import { registerIncidentRoutes } from './register_routes';

type Handler = (
  context: unknown,
  request: ReturnType<typeof httpServerMock.createKibanaRequest>,
  response: ReturnType<typeof httpServerMock.createResponseFactory>
) => Promise<unknown>;

interface RegisteredRoute {
  config: {
    path: string;
    access?: string;
    security?: { authz?: { requiredPrivileges?: string[] } };
  };
  handler: Handler;
}

const MOCK_INCIDENT = { id: 'incident-1', template_id: 'incident', title: 'Test Incident' };

const registerAndCollect = (service: Partial<IncidentsService>) => {
  const router = httpServiceMock.createRouter();
  const posts: RegisteredRoute[] = [];
  const patches: RegisteredRoute[] = [];

  (router.versioned.post as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => posts.push({ config, handler }),
  }));
  (router.versioned.patch as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => patches.push({ config, handler }),
  }));

  registerIncidentRoutes({
    router,
    logger: loggingSystemMock.createLogger(),
    getIncidentsService: () => service as IncidentsService,
  } as unknown as IncidentRouteDependencies);

  const byPath = (routes: RegisteredRoute[], path: string) =>
    routes.find(({ config }) => config.path === path)!;

  return { router, posts, patches, byPath };
};

describe('incident routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('privilege wiring', () => {
    it('gates create on INCIDENTS_API_PRIVILEGE_MANAGE', () => {
      const { byPath, posts } = registerAndCollect({});
      expect(
        byPath(posts, INCIDENTS_INTERNAL_URL).config.security?.authz?.requiredPrivileges
      ).toEqual([INCIDENTS_API_PRIVILEGE_MANAGE]);
    });

    it('gates update on INCIDENTS_API_PRIVILEGE_MANAGE', () => {
      const { byPath, patches } = registerAndCollect({});
      expect(
        byPath(patches, INCIDENT_BY_ID_URL).config.security?.authz?.requiredPrivileges
      ).toEqual([INCIDENTS_API_PRIVILEGE_MANAGE]);
    });

    it('marks both routes as internal', () => {
      const { byPath, posts, patches } = registerAndCollect({});
      expect(byPath(posts, INCIDENTS_INTERNAL_URL).config.access).toBe('internal');
      expect(byPath(patches, INCIDENT_BY_ID_URL).config.access).toBe('internal');
    });
  });

  describe('route shape', () => {
    it('does not register a GET (list) route — list is deferred to a follow-up ticket', () => {
      const { router } = registerAndCollect({});
      expect(router.versioned.get).not.toHaveBeenCalled();
    });

    it('does not register a PUT or DELETE route', () => {
      const { router } = registerAndCollect({});
      expect(router.versioned.put).not.toHaveBeenCalled();
      expect(router.versioned.delete).not.toHaveBeenCalled();
    });
  });

  describe('create incident handler', () => {
    it('calls service.create and returns 200 with the incident', async () => {
      const create = jest.fn().mockResolvedValue(MOCK_INCIDENT);
      const { byPath, posts } = registerAndCollect({ create });
      const response = httpServerMock.createResponseFactory();

      await byPath(posts, INCIDENTS_INTERNAL_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          body: {
            linked_investigation_id: 'inv-1',
            visibility: 'private',
            collaborators: ['user-1'],
          },
        }),
        response
      );

      expect(create).toHaveBeenCalledTimes(1);
      expect(response.ok).toHaveBeenCalledWith({ body: MOCK_INCIDENT });
    });

    it('maps InvalidLinkedInvestigationError to 400', async () => {
      const create = jest
        .fn()
        .mockRejectedValue(new InvalidLinkedInvestigationError('not-an-investigation'));
      const { byPath, posts } = registerAndCollect({ create });
      const response = httpServerMock.createResponseFactory();

      await byPath(posts, INCIDENTS_INTERNAL_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          body: { linked_investigation_id: 'not-an-investigation', visibility: 'public' },
        }),
        response
      );

      expect(response.badRequest).toHaveBeenCalled();
    });

    it('maps a conversationNotFound AgentBuilderError to 404', async () => {
      const create = jest
        .fn()
        .mockRejectedValue(createConversationNotFoundError({ conversationId: 'inv-1' }));
      const { byPath, posts } = registerAndCollect({ create });
      const response = httpServerMock.createResponseFactory();

      await byPath(posts, INCIDENTS_INTERNAL_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          body: { linked_investigation_id: 'inv-1', visibility: 'public' },
        }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });

    it('maps an unknown error to 500', async () => {
      const create = jest.fn().mockRejectedValue(new Error('unexpected'));
      const { byPath, posts } = registerAndCollect({ create });
      const response = httpServerMock.createResponseFactory();

      await byPath(posts, INCIDENTS_INTERNAL_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          body: { linked_investigation_id: 'inv-1', visibility: 'public' },
        }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });

  describe('update incident handler', () => {
    it('reads the incident id from request.params, never from request.body', async () => {
      const update = jest.fn().mockResolvedValue(MOCK_INCIDENT);
      const { byPath, patches } = registerAndCollect({ update });
      const response = httpServerMock.createResponseFactory();

      await byPath(patches, INCIDENT_BY_ID_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          params: { id: 'incident-1' },
          body: { title: 'New title' },
        }),
        response
      );

      // id comes from params, not from body
      expect(update).toHaveBeenCalledWith(
        expect.anything(), // KibanaRequest
        'incident-1',
        expect.objectContaining({ title: 'New title' })
      );
      expect(response.ok).toHaveBeenCalledWith({ body: MOCK_INCIDENT });
    });

    it('maps a conversationWriteConflict to 409', async () => {
      const update = jest
        .fn()
        .mockRejectedValue(createConversationWriteConflictError({ conversationId: 'incident-1' }));
      const { byPath, patches } = registerAndCollect({ update });
      const response = httpServerMock.createResponseFactory();

      await byPath(patches, INCIDENT_BY_ID_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          params: { id: 'incident-1' },
          body: { title: 'New title' },
        }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 409 })
      );
    });
  });
});
