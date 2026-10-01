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
  INVESTIGATION_ASSIGN_URL,
  INVESTIGATION_BY_ID_URL,
  INVESTIGATIONS_INTERNAL_URL,
  INVESTIGATIONS_PRIVILEGES_URL,
  INVESTIGATIONS_SEVERITY_COUNTS_URL,
} from '../../../common/investigations/constants';
import { WrongTemplateError } from '../../assignments/assignments_service';
import type { AssignmentsService } from '../../assignments/assignments_service';
import { InvestigationAttachmentInvalidRequestError } from '../../investigation_attachments';
import {
  INVESTIGATIONS_API_PRIVILEGE_MANAGE,
  INVESTIGATIONS_API_PRIVILEGE_READ,
} from '../constants';
import type { InvestigationsQueryService } from '../services/investigations_query_service';
import type { InvestigationRouteDependencies } from '../types';
import { registerInvestigationRoutes } from './register_routes';

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

const MOCK_INVESTIGATION = {
  id: 'investigation-1',
  template_id: 'investigation',
  title: 'Test Investigation',
};

const registerAndCollect = (assignFn: jest.Mock) => {
  const router = httpServiceMock.createRouter();
  const puts: RegisteredRoute[] = [];

  (router.versioned.put as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => puts.push({ config, handler }),
  }));

  registerInvestigationRoutes({
    router,
    logger: loggingSystemMock.createLogger(),
    getAssignmentsService: () => ({ assign: assignFn } as unknown as AssignmentsService),
  } as unknown as InvestigationRouteDependencies);

  const byPath = (routes: RegisteredRoute[], path: string) =>
    routes.find(({ config }) => config.path === path)!;

  return { router, puts, byPath };
};

describe('investigation routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('privilege wiring', () => {
    it('gates assign on INVESTIGATIONS_API_PRIVILEGE_MANAGE', () => {
      const { byPath, puts } = registerAndCollect(jest.fn());
      expect(
        byPath(puts, INVESTIGATION_ASSIGN_URL).config.security?.authz?.requiredPrivileges
      ).toEqual([INVESTIGATIONS_API_PRIVILEGE_MANAGE]);
    });

    it('marks the assign route as internal', () => {
      const { byPath, puts } = registerAndCollect(jest.fn());
      expect(byPath(puts, INVESTIGATION_ASSIGN_URL).config.access).toBe('internal');
    });
  });

  describe('assign investigation handler', () => {
    it('calls service.assign and returns 200', async () => {
      const assign = jest.fn().mockResolvedValue(MOCK_INVESTIGATION);
      const { byPath, puts } = registerAndCollect(assign);
      const response = httpServerMock.createResponseFactory();

      await byPath(puts, INVESTIGATION_ASSIGN_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          params: { id: 'investigation-1' },
          body: { assignees: ['user-1'] },
        }),
        response
      );

      expect(assign).toHaveBeenCalledTimes(1);
      expect(response.ok).toHaveBeenCalledWith({ body: MOCK_INVESTIGATION });
    });

    it('maps WrongTemplateError to 404', async () => {
      const assign = jest.fn().mockRejectedValue(new WrongTemplateError('conv-1', 'investigation'));
      const { byPath, puts } = registerAndCollect(assign);
      const response = httpServerMock.createResponseFactory();

      await byPath(puts, INVESTIGATION_ASSIGN_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          params: { id: 'conv-1' },
          body: { assignees: [] },
        }),
        response
      );

      expect(response.notFound).toHaveBeenCalled();
    });

    it('maps a conversationNotFound AgentBuilderError to 404', async () => {
      const assign = jest
        .fn()
        .mockRejectedValue(createConversationNotFoundError({ conversationId: 'investigation-1' }));
      const { byPath, puts } = registerAndCollect(assign);
      const response = httpServerMock.createResponseFactory();

      await byPath(puts, INVESTIGATION_ASSIGN_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          params: { id: 'investigation-1' },
          body: { assignees: [] },
        }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });

    it('maps an unknown error to 500', async () => {
      const assign = jest.fn().mockRejectedValue(new Error('unexpected'));
      const { byPath, puts } = registerAndCollect(assign);
      const response = httpServerMock.createResponseFactory();

      await byPath(puts, INVESTIGATION_ASSIGN_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          params: { id: 'investigation-1' },
          body: { assignees: [] },
        }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });

  describe('privileges probe', () => {
    const PRIVILEGES = {
      investigations: { read: true, manage: false },
      escalations: { read: true, manage: true },
    };

    const registerProbe = (getPrivileges: jest.Mock) => {
      const router = httpServiceMock.createRouter();
      registerInvestigationRoutes({
        router,
        logger: loggingSystemMock.createLogger(),
        getAssignmentsService: jest.fn(),
        privileges: { getPrivileges },
      } as unknown as InvestigationRouteDependencies);
      return router.versioned.getRoute('get', INVESTIGATIONS_PRIVILEGES_URL);
    };

    it('is an internal route without authz, since it only reports the caller', () => {
      const { config } = registerProbe(jest.fn());

      expect(config.access).toBe('internal');
      expect(config.security?.authz).toEqual(expect.objectContaining({ enabled: false }));
    });

    it('returns the caller privileges', async () => {
      const getPrivileges = jest.fn().mockResolvedValue(PRIVILEGES);
      const route = registerProbe(getPrivileges);
      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();

      await route.versions['1'].handler({} as never, request, response);

      expect(getPrivileges).toHaveBeenCalledWith(request);
      expect(response.ok).toHaveBeenCalledWith({ body: PRIVILEGES });
    });

    it('maps an unexpected failure to 500', async () => {
      const route = registerProbe(jest.fn().mockRejectedValue(new Error('boom')));
      const response = httpServerMock.createResponseFactory();

      await route.versions['1'].handler(
        {} as never,
        httpServerMock.createKibanaRequest(),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });
});

interface QueryRoute {
  method: 'get' | 'post' | 'put';
  config: { path: string; security?: { authz?: { requiredPrivileges?: unknown[] } } };
  handler: Handler;
}

const READ_AUTHZ = [
  { anyRequired: [INVESTIGATIONS_API_PRIVILEGE_READ, INVESTIGATIONS_API_PRIVILEGE_MANAGE] },
];

const register = ({
  queryService = {},
}: {
  queryService?: Partial<Record<keyof InvestigationsQueryService, jest.Mock>>;
} = {}) => {
  const router = httpServiceMock.createRouter();
  const routes: QueryRoute[] = [];
  for (const method of ['get', 'post', 'put'] as const) {
    (router.versioned[method] as jest.Mock).mockImplementation((config) => ({
      addVersion: (_version: unknown, handler: Handler) => routes.push({ method, config, handler }),
    }));
  }
  registerInvestigationRoutes({
    router,
    logger: loggingSystemMock.createLogger(),
    getAssignmentsService: jest.fn(),
    getInvestigationStatusService: jest.fn(),
    getInvestigationsQueryService: () => queryService as unknown as InvestigationsQueryService,
  } as InvestigationRouteDependencies);

  const find = (method: QueryRoute['method'], path: string) => {
    const route = routes.find((entry) => entry.method === method && entry.config.path === path);
    if (!route) {
      throw new Error(`No ${method} route for ${path}`);
    }
    return route;
  };
  return { routes, find };
};

describe('investigation query routes', () => {
  it('gates reads on the read or the manage privilege', () => {
    const { find } = register();

    expect(find('get', INVESTIGATION_BY_ID_URL).config.security?.authz?.requiredPrivileges).toEqual(
      READ_AUTHZ
    );
    expect(
      find('get', INVESTIGATIONS_INTERNAL_URL).config.security?.authz?.requiredPrivileges
    ).toEqual(READ_AUTHZ);
    expect(
      find('get', INVESTIGATIONS_SEVERITY_COUNTS_URL).config.security?.authz?.requiredPrivileges
    ).toEqual(READ_AUTHZ);
  });

  it('registers the severity counts before the by-id route', () => {
    const { routes } = register();
    const paths = routes.map(({ config }) => config.path);

    expect(paths.indexOf(INVESTIGATIONS_SEVERITY_COUNTS_URL)).toBeLessThan(
      paths.indexOf(INVESTIGATION_BY_ID_URL)
    );
  });

  it('returns the investigation', async () => {
    const get = jest.fn().mockResolvedValue({ id: 'conv-1' });
    const { find } = register({ queryService: { get } });
    const request = httpServerMock.createKibanaRequest({ params: { id: 'conv-1' } });
    const response = httpServerMock.createResponseFactory();

    await find('get', INVESTIGATION_BY_ID_URL).handler({}, request, response);

    expect(get).toHaveBeenCalledWith(request, 'conv-1');
    expect(response.ok).toHaveBeenCalledWith({ body: { id: 'conv-1' } });
  });

  it.each([
    ['a wrong template', new WrongTemplateError('conv-1', 'investigation'), 'notFound'],
    ['a missing conversation', createConversationNotFoundError({ conversationId: 'x' }), 'custom'],
  ])('maps %s to a 404', async (_label, error, kind) => {
    const { find } = register({ queryService: { get: jest.fn().mockRejectedValue(error) } });
    const response = httpServerMock.createResponseFactory();

    await find('get', INVESTIGATION_BY_ID_URL).handler(
      {},
      httpServerMock.createKibanaRequest({ params: { id: 'conv-1' } }),
      response
    );

    if (kind === 'notFound') {
      expect(response.notFound).toHaveBeenCalled();
    } else {
      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    }
  });

  it('passes the validated list query and the severity count filters to the service', async () => {
    const list = jest.fn().mockResolvedValue({ results: [] });
    const severityCounts = jest.fn().mockResolvedValue({});
    const { find } = register({ queryService: { list, severityCounts } });
    const query = { status: ['open'], page: 1, per_page: 20 };

    await find('get', INVESTIGATIONS_INTERNAL_URL).handler(
      {},
      httpServerMock.createKibanaRequest({ query }),
      httpServerMock.createResponseFactory()
    );
    await find('get', INVESTIGATIONS_SEVERITY_COUNTS_URL).handler(
      {},
      httpServerMock.createKibanaRequest({ query: { severity: ['high'] } }),
      httpServerMock.createResponseFactory()
    );

    expect(list).toHaveBeenCalledWith(expect.anything(), query);
    expect(severityCounts).toHaveBeenCalledWith(expect.anything(), { severity: ['high'] });
  });

  it('maps an invalid read to a 400', async () => {
    const { find } = register({
      queryService: {
        list: jest
          .fn()
          .mockRejectedValue(new InvestigationAttachmentInvalidRequestError('too many')),
      },
    });
    const response = httpServerMock.createResponseFactory();

    await find('get', INVESTIGATIONS_INTERNAL_URL).handler(
      {},
      httpServerMock.createKibanaRequest({ query: {} }),
      response
    );

    expect(response.badRequest).toHaveBeenCalledWith({ body: { message: 'too many' } });
  });
});
