/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  API_VERSIONS,
  INBOX_ACTIONS_URL,
  INTERNAL_API_ACCESS,
  ListInboxActionsRequestQuery,
  ListInboxActionsResponse,
  type ListInboxActionsRequestQueryInput,
} from '@kbn/inbox-common';
import { registerListInboxActionsRoute } from './list_actions';
import { InboxActionRegistry } from '../../services/inbox_action_registry';
import type { InboxActionProvider } from '../../services/inbox_action_provider';
import {
  createStubInboxAction,
  createStubInboxActions,
} from '../../../common/test_helpers/create_stub_inbox_action';
import { INBOX_API_PRIVILEGE_READ } from '../../../common';

const getSpaceId = () => 'default';

type Router = ReturnType<typeof httpServiceMock.createRouter>;

const fakeProvider = (
  sourceApp: string,
  actions = createStubInboxActions(3, { source_app: sourceApp })
): jest.Mocked<InboxActionProvider> => ({
  sourceApp,
  list: jest.fn<ReturnType<InboxActionProvider['list']>, Parameters<InboxActionProvider['list']>>(
    async ({ status }) => {
      const filtered = actions.filter((action) => !status || action.status === status);
      return { actions: filtered, total: filtered.length };
    }
  ),
  respond: jest.fn<
    ReturnType<InboxActionProvider['respond']>,
    Parameters<InboxActionProvider['respond']>
  >(async () => {}),
});

const getHandler = (router: Router) => {
  const route = router.versioned.getRoute('get', INBOX_ACTIONS_URL);
  const version = route.versions[API_VERSIONS.internal.v1];
  if (!version) {
    throw new Error(`No version '${API_VERSIONS.internal.v1}' registered for ${INBOX_ACTIONS_URL}`);
  }
  return version.handler;
};

const invokeHandler = async (router: Router, query: ListInboxActionsRequestQueryInput = {}) => {
  const handler = getHandler(router);
  const parsedQuery = ListInboxActionsRequestQuery.parse(query);
  const request = httpServerMock.createKibanaRequest({
    method: 'get',
    path: INBOX_ACTIONS_URL,
    query: parsedQuery,
  });
  const response = httpServerMock.createResponseFactory();
  await handler({} as never, request, response);
  return response;
};

const getOkBody = (response: ReturnType<typeof httpServerMock.createResponseFactory>) => {
  const [[{ body }]] = response.ok.mock.calls as unknown as [[{ body: ListInboxActionsResponse }]];
  return body;
};

describe('GET /internal/inbox/actions', () => {
  let router: Router;
  let logger: ReturnType<typeof loggerMock.create>;
  let registry: InboxActionRegistry;

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    logger = loggerMock.create();
    registry = new InboxActionRegistry(logger);
    registerListInboxActionsRoute({ router, logger, registry, getSpaceId });
  });

  describe('route registration', () => {
    it('registers a single versioned internal route at INBOX_ACTIONS_URL', () => {
      expect(router.versioned.get).toHaveBeenCalledTimes(1);
      const [config] = router.versioned.get.mock.calls[0];
      expect(config).toMatchObject({
        path: INBOX_ACTIONS_URL,
        access: INTERNAL_API_ACCESS,
        // Read-only privilege so the list endpoint stays reachable under the
        // `read` feature privilege; the respond endpoint uses a separate
        // `inbox_respond` privilege.
        security: { authz: { requiredPrivileges: [INBOX_API_PRIVILEGE_READ] } },
      });
    });

    it('registers the handler under the v1 internal API version', () => {
      expect(() => getHandler(router)).not.toThrow();
    });
  });

  describe('with no providers registered', () => {
    it('returns an empty list and zero total', async () => {
      const body = getOkBody(await invokeHandler(router));
      expect(body).toEqual({ actions: [], total: 0 });
    });
  });

  describe('space scoping', () => {
    it('forwards the active space id from the resolver into the registry context', async () => {
      // Regression guard: the route used to hardcode `'default'`, which
      // silently leaked cross-space rows from every provider. The resolver
      // returns the active space id for the current request.
      const captured: string[] = [];
      const capturingProvider: InboxActionProvider = {
        sourceApp: 'workflows',
        list: jest.fn(async (_params, ctx) => {
          captured.push(ctx.spaceId);
          return { actions: [], total: 0 };
        }),
        respond: jest.fn(async () => {}),
      };
      const dedicatedRouter = httpServiceMock.createRouter();
      const dedicatedRegistry = new InboxActionRegistry(logger);
      dedicatedRegistry.register(capturingProvider);
      registerListInboxActionsRoute({
        router: dedicatedRouter,
        logger,
        registry: dedicatedRegistry,
        getSpaceId: () => 'security-team',
      });
      const handler = dedicatedRouter.versioned.getRoute('get', INBOX_ACTIONS_URL).versions[
        API_VERSIONS.internal.v1
      ].handler;
      const req = httpServerMock.createKibanaRequest({
        method: 'get',
        path: INBOX_ACTIONS_URL,
        query: ListInboxActionsRequestQuery.parse({}),
      });
      await handler({} as never, req, httpServerMock.createResponseFactory());
      expect(captured).toEqual(['security-team']);
    });
  });

  describe('with a single provider', () => {
    beforeEach(() => {
      registry.register(fakeProvider('workflows'));
    });

    it('returns all actions from the provider under default pagination', async () => {
      const body = getOkBody(await invokeHandler(router));
      expect(body.total).toBe(3);
      expect(body.actions).toHaveLength(3);
      expect(body.actions.every((action) => action.source_app === 'workflows')).toBe(true);
    });

    it('produces a response that conforms to ListInboxActionsResponse', async () => {
      const body = getOkBody(await invokeHandler(router));
      expect(() => ListInboxActionsResponse.parse(body)).not.toThrow();
    });

    it('forwards the status filter to the provider', async () => {
      const body = getOkBody(await invokeHandler(router, { status: 'approved' }));
      expect(body.actions.every((action) => action.status === 'approved')).toBe(true);
    });
  });

  describe('with multiple providers', () => {
    beforeEach(() => {
      registry.register(
        fakeProvider('workflows', [
          createStubInboxAction({
            id: 'w-1',
            source_app: 'workflows',
            created_at: '2026-04-24T12:00:00.000Z',
          }),
          createStubInboxAction({
            id: 'w-2',
            source_app: 'workflows',
            created_at: '2026-04-24T10:00:00.000Z',
          }),
        ])
      );
      registry.register(
        fakeProvider('evals', [
          createStubInboxAction({
            id: 'e-1',
            source_app: 'evals',
            created_at: '2026-04-24T11:00:00.000Z',
          }),
        ])
      );
    });

    it('merge-sorts across sources by created_at desc', async () => {
      const body = getOkBody(await invokeHandler(router));
      expect(body.actions.map((action) => action.id)).toEqual(['w-1', 'e-1', 'w-2']);
      expect(body.total).toBe(3);
    });

    it('scopes to a single provider when source_app is provided', async () => {
      const body = getOkBody(await invokeHandler(router, { source_app: 'evals' }));
      expect(body.actions.map((action) => action.source_app)).toEqual(['evals']);
      expect(body.total).toBe(1);
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      const actions = Array.from({ length: 5 }, (_, i) =>
        createStubInboxAction({
          id: `a-${i}`,
          source_app: 'workflows',
          created_at: new Date(Date.UTC(2026, 3, 24, 12, i)).toISOString(),
        })
      );
      registry.register(fakeProvider('workflows', actions));
    });

    it('honors page and per_page', async () => {
      const body = getOkBody(await invokeHandler(router, { page: 2, per_page: 2 }));
      expect(body.total).toBe(5);
      expect(body.actions).toHaveLength(2);
    });

    it('returns an empty page past the last record while preserving total', async () => {
      const body = getOkBody(await invokeHandler(router, { page: 99, per_page: 2 }));
      expect(body.actions).toEqual([]);
      expect(body.total).toBe(5);
    });
  });

  describe('error handling', () => {
    it('returns a 500 when the registry throws unexpectedly', async () => {
      const broken = fakeProvider('workflows');
      // list() errors are swallowed inside the registry; force the registry
      // itself to throw so we can exercise the route's catch branch.
      const registryThatThrows = new InboxActionRegistry(logger);
      jest.spyOn(registryThatThrows, 'list').mockRejectedValueOnce(new Error('boom'));
      registryThatThrows.register(broken);

      const dedicatedRouter = httpServiceMock.createRouter();
      registerListInboxActionsRoute({
        router: dedicatedRouter,
        logger,
        registry: registryThatThrows,
        getSpaceId,
      });

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: INBOX_ACTIONS_URL,
        query: ListInboxActionsRequestQuery.parse({}),
      });
      const response = httpServerMock.createResponseFactory();
      const handler = dedicatedRouter.versioned.getRoute('get', INBOX_ACTIONS_URL).versions[
        API_VERSIONS.internal.v1
      ].handler;
      await handler({} as never, request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });
});
