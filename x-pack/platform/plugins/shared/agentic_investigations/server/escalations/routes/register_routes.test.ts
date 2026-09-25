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
import {
  ESCALATIONS_INTERNAL_URL,
  ESCALATIONS_SUGGEST_USERS_URL,
  ESCALATION_ASSIGN_URL,
  ESCALATION_BY_ID_URL,
  ESCALATION_LINKED_INVESTIGATIONS_URL,
} from '../../../common/escalations/constants';
import { ESCALATIONS_API_PRIVILEGE_MANAGE, ESCALATIONS_API_PRIVILEGE_READ } from '../constants';
import type { AssignmentsService } from '../../assignments/assignments_service';
import type { EscalationsService } from '../services/escalations_service';
import { InvalidLinkedInvestigationError, NotAnEscalationError } from '../services/errors';
import type { EscalationRouteDependencies } from '../types';
import { registerEscalationRoutes } from './register_routes';

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
    options?: { access?: string };
  };
  handler: Handler;
}

const MOCK_ESCALATION = { id: 'escalation-1', template_id: 'escalation', title: 'Test Escalation' };

const registerAndCollect = (service: Partial<EscalationsService>) => {
  const router = httpServiceMock.createRouter();
  const gets: RegisteredRoute[] = [];
  const posts: RegisteredRoute[] = [];
  const patches: RegisteredRoute[] = [];
  const puts: RegisteredRoute[] = [];
  // Unversioned posts (e.g. the suggest-users endpoint)
  const plainPosts: RegisteredRoute[] = [];

  (router.versioned.get as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => gets.push({ config, handler }),
  }));
  (router.versioned.post as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => posts.push({ config, handler }),
  }));
  (router.versioned.patch as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => patches.push({ config, handler }),
  }));
  (router.versioned.put as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => puts.push({ config, handler }),
  }));
  (router.post as jest.Mock).mockImplementation((config, handler: Handler) =>
    plainPosts.push({ config, handler })
  );

  registerEscalationRoutes({
    router,
    logger: loggingSystemMock.createLogger(),
    getEscalationsService: () => service as EscalationsService,
    getAssignmentsService: jest.fn() as unknown as () => AssignmentsService,
    getSpaceId: () => 'default',
    getSecurity: jest.fn().mockResolvedValue(undefined),
  } as unknown as EscalationRouteDependencies);

  const byPath = (routes: RegisteredRoute[], path: string) =>
    routes.find(({ config }) => config.path === path)!;

  return { router, gets, posts, patches, puts, plainPosts, byPath };
};

describe('escalation routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('privilege wiring', () => {
    it('gates list on ESCALATIONS_API_PRIVILEGE_READ', () => {
      const { byPath, gets } = registerAndCollect({});
      expect(
        byPath(gets, ESCALATIONS_INTERNAL_URL).config.security?.authz?.requiredPrivileges
      ).toEqual([ESCALATIONS_API_PRIVILEGE_READ]);
    });

    it('gates create on ESCALATIONS_API_PRIVILEGE_MANAGE', () => {
      const { byPath, posts } = registerAndCollect({});
      expect(
        byPath(posts, ESCALATIONS_INTERNAL_URL).config.security?.authz?.requiredPrivileges
      ).toEqual([ESCALATIONS_API_PRIVILEGE_MANAGE]);
    });

    it('gates update on ESCALATIONS_API_PRIVILEGE_MANAGE', () => {
      const { byPath, patches } = registerAndCollect({});
      expect(
        byPath(patches, ESCALATION_BY_ID_URL).config.security?.authz?.requiredPrivileges
      ).toEqual([ESCALATIONS_API_PRIVILEGE_MANAGE]);
    });

    it('gates assign on ESCALATIONS_API_PRIVILEGE_MANAGE', () => {
      const { byPath, puts } = registerAndCollect({});
      expect(
        byPath(puts, ESCALATION_ASSIGN_URL).config.security?.authz?.requiredPrivileges
      ).toEqual([ESCALATIONS_API_PRIVILEGE_MANAGE]);
    });

    it('marks all routes as internal', () => {
      const { byPath, gets, posts, patches, puts, plainPosts } = registerAndCollect({});
      expect(byPath(gets, ESCALATIONS_INTERNAL_URL).config.access).toBe('internal');
      expect(byPath(gets, ESCALATION_LINKED_INVESTIGATIONS_URL).config.access).toBe('internal');
      expect(byPath(posts, ESCALATIONS_INTERNAL_URL).config.access).toBe('internal');
      expect(byPath(patches, ESCALATION_BY_ID_URL).config.access).toBe('internal');
      expect(byPath(puts, ESCALATION_ASSIGN_URL).config.access).toBe('internal');
      expect(byPath(plainPosts, ESCALATIONS_SUGGEST_USERS_URL).config.options?.access).toBe(
        'internal'
      );
    });

    it('gates suggest-users on ESCALATIONS_API_PRIVILEGE_MANAGE', () => {
      const { byPath, plainPosts } = registerAndCollect({});
      expect(
        byPath(plainPosts, ESCALATIONS_SUGGEST_USERS_URL).config.security?.authz?.requiredPrivileges
      ).toEqual([ESCALATIONS_API_PRIVILEGE_MANAGE]);
    });

    it('gates list-linked-investigations on ESCALATIONS_API_PRIVILEGE_READ', () => {
      const { byPath, gets } = registerAndCollect({});
      expect(
        byPath(gets, ESCALATION_LINKED_INVESTIGATIONS_URL).config.security?.authz
          ?.requiredPrivileges
      ).toEqual([ESCALATIONS_API_PRIVILEGE_READ]);
    });
  });

  describe('route shape', () => {
    it('registers a GET route at ESCALATIONS_INTERNAL_URL for the list endpoint', () => {
      const { byPath, gets } = registerAndCollect({});
      expect(byPath(gets, ESCALATIONS_INTERNAL_URL)).toBeDefined();
    });

    it('registers a PUT route at ESCALATION_ASSIGN_URL for the assign endpoint', () => {
      const { byPath, puts } = registerAndCollect({});
      expect(byPath(puts, ESCALATION_ASSIGN_URL)).toBeDefined();
    });

    it('does not register a DELETE route', () => {
      const { router } = registerAndCollect({});
      expect(router.versioned.delete).not.toHaveBeenCalled();
    });
  });

  describe('create escalation handler', () => {
    it('calls service.create and returns 200 with the escalation', async () => {
      const create = jest.fn().mockResolvedValue(MOCK_ESCALATION);
      const { byPath, posts } = registerAndCollect({ create });
      const response = httpServerMock.createResponseFactory();

      await byPath(posts, ESCALATIONS_INTERNAL_URL).handler(
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
      expect(response.ok).toHaveBeenCalledWith({ body: MOCK_ESCALATION });
    });

    it('maps InvalidLinkedInvestigationError to 400', async () => {
      const create = jest
        .fn()
        .mockRejectedValue(new InvalidLinkedInvestigationError('not-an-investigation'));
      const { byPath, posts } = registerAndCollect({ create });
      const response = httpServerMock.createResponseFactory();

      await byPath(posts, ESCALATIONS_INTERNAL_URL).handler(
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

      await byPath(posts, ESCALATIONS_INTERNAL_URL).handler(
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

      await byPath(posts, ESCALATIONS_INTERNAL_URL).handler(
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

  describe('list escalations handler', () => {
    const MOCK_LIST_RESPONSE = {
      pagination: { total: 2, page: 1, per_page: 50 },
      results: [MOCK_ESCALATION, { ...MOCK_ESCALATION, id: 'escalation-2' }],
    };

    it('calls service.list with request.query and returns 200', async () => {
      const list = jest.fn().mockResolvedValue(MOCK_LIST_RESPONSE);
      const { byPath, gets } = registerAndCollect({ list });
      const response = httpServerMock.createResponseFactory();

      await byPath(gets, ESCALATIONS_INTERNAL_URL).handler(
        {},
        httpServerMock.createKibanaRequest({ query: { page: 1, per_page: 50 } }),
        response
      );

      expect(list).toHaveBeenCalledTimes(1);
      expect(response.ok).toHaveBeenCalledWith({ body: MOCK_LIST_RESPONSE });
    });

    it('maps an unknown error to 500', async () => {
      const list = jest.fn().mockRejectedValue(new Error('unexpected'));
      const { byPath, gets } = registerAndCollect({ list });
      const response = httpServerMock.createResponseFactory();

      await byPath(gets, ESCALATIONS_INTERNAL_URL).handler(
        {},
        httpServerMock.createKibanaRequest({ query: { page: 1, per_page: 50 } }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });

    it('maps a conversationNotFound AgentBuilderError to 404', async () => {
      const list = jest
        .fn()
        .mockRejectedValue(createConversationNotFoundError({ conversationId: 'inv-1' }));
      const { byPath, gets } = registerAndCollect({ list });
      const response = httpServerMock.createResponseFactory();

      await byPath(gets, ESCALATIONS_INTERNAL_URL).handler(
        {},
        httpServerMock.createKibanaRequest({ query: { page: 1, per_page: 50 } }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });

  describe('list linked investigations handler', () => {
    const MOCK_LINKED_RESPONSE = {
      results: [
        { id: 'inv-1', title: 'Mass file encryption', status: 'open', agent_id: 'agent-1' },
        { id: 'inv-2', title: 'Privilege escalation', status: 'closed', agent_id: 'agent-2' },
      ],
    };

    it('calls service.listLinkedInvestigations with the escalation id from params and returns 200', async () => {
      const listLinkedInvestigations = jest.fn().mockResolvedValue(MOCK_LINKED_RESPONSE);
      const { byPath, gets } = registerAndCollect({ listLinkedInvestigations });
      const response = httpServerMock.createResponseFactory();

      await byPath(gets, ESCALATION_LINKED_INVESTIGATIONS_URL).handler(
        {},
        httpServerMock.createKibanaRequest({ params: { id: 'escalation-1' } }),
        response
      );

      expect(listLinkedInvestigations).toHaveBeenCalledWith(
        expect.anything(), // KibanaRequest
        'escalation-1'
      );
      expect(response.ok).toHaveBeenCalledWith({ body: MOCK_LINKED_RESPONSE });
    });

    it('maps NotAnEscalationError to 404', async () => {
      const listLinkedInvestigations = jest
        .fn()
        .mockRejectedValue(new NotAnEscalationError('conv-1'));
      const { byPath, gets } = registerAndCollect({ listLinkedInvestigations });
      const response = httpServerMock.createResponseFactory();

      await byPath(gets, ESCALATION_LINKED_INVESTIGATIONS_URL).handler(
        {},
        httpServerMock.createKibanaRequest({ params: { id: 'conv-1' } }),
        response
      );

      expect(response.notFound).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ message: expect.any(String) }) })
      );
    });

    it('maps a conversationNotFound AgentBuilderError to 404 (inaccessible escalation)', async () => {
      const listLinkedInvestigations = jest
        .fn()
        .mockRejectedValue(createConversationNotFoundError({ conversationId: 'escalation-1' }));
      const { byPath, gets } = registerAndCollect({ listLinkedInvestigations });
      const response = httpServerMock.createResponseFactory();

      await byPath(gets, ESCALATION_LINKED_INVESTIGATIONS_URL).handler(
        {},
        httpServerMock.createKibanaRequest({ params: { id: 'escalation-1' } }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });

    it('maps an unknown error to 500', async () => {
      const listLinkedInvestigations = jest.fn().mockRejectedValue(new Error('unexpected'));
      const { byPath, gets } = registerAndCollect({ listLinkedInvestigations });
      const response = httpServerMock.createResponseFactory();

      await byPath(gets, ESCALATION_LINKED_INVESTIGATIONS_URL).handler(
        {},
        httpServerMock.createKibanaRequest({ params: { id: 'escalation-1' } }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });

  describe('update escalation handler', () => {
    it('reads the escalation id from request.params, never from request.body', async () => {
      const update = jest.fn().mockResolvedValue(MOCK_ESCALATION);
      const { byPath, patches } = registerAndCollect({ update });
      const response = httpServerMock.createResponseFactory();

      await byPath(patches, ESCALATION_BY_ID_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          params: { id: 'escalation-1' },
          body: { title: 'New title' },
        }),
        response
      );

      // id comes from params, not from body
      expect(update).toHaveBeenCalledWith(
        expect.anything(), // KibanaRequest
        'escalation-1',
        expect.objectContaining({ title: 'New title' })
      );
      expect(response.ok).toHaveBeenCalledWith({ body: MOCK_ESCALATION });
    });

    it('maps NotAnEscalationError to 404', async () => {
      const update = jest.fn().mockRejectedValue(new NotAnEscalationError('conv-1'));
      const { byPath, patches } = registerAndCollect({ update });
      const response = httpServerMock.createResponseFactory();

      await byPath(patches, ESCALATION_BY_ID_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          params: { id: 'conv-1' },
          body: { title: 'New title' },
        }),
        response
      );

      expect(response.notFound).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ message: expect.any(String) }) })
      );
    });

    it('maps a conversationWriteConflict to 409', async () => {
      const update = jest
        .fn()
        .mockRejectedValue(
          createConversationWriteConflictError({ conversationId: 'escalation-1' })
        );
      const { byPath, patches } = registerAndCollect({ update });
      const response = httpServerMock.createResponseFactory();

      await byPath(patches, ESCALATION_BY_ID_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          params: { id: 'escalation-1' },
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
