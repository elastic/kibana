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
import { STUB_INBOX_ACTIONS } from './stub_actions';
import { PLUGIN_ID } from '../../../common';

type Router = ReturnType<typeof httpServiceMock.createRouter>;

const getHandler = (router: Router) => {
  const route = router.versioned.getRoute('get', INBOX_ACTIONS_URL);
  const version = route.versions[API_VERSIONS.internal.v1];
  if (!version) {
    throw new Error(`No version '${API_VERSIONS.internal.v1}' registered for ${INBOX_ACTIONS_URL}`);
  }
  return version.handler;
};

// Invoke the handler with query params that have been parsed through the same
// Zod schema the framework would apply, so defaults (page/per_page) are
// populated and coerced exactly as they would be in production.
const invokeHandler = async (router: Router, query: ListInboxActionsRequestQueryInput = {}) => {
  const handler = getHandler(router);
  const parsedQuery = ListInboxActionsRequestQuery.parse(query);
  const request = httpServerMock.createKibanaRequest({
    method: 'get',
    path: INBOX_ACTIONS_URL,
    query: parsedQuery,
  });
  const response = httpServerMock.createResponseFactory();
  // The request handler context is unused by this handler.
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

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    logger = loggerMock.create();
    registerListInboxActionsRoute({ router, logger });
  });

  describe('route registration', () => {
    it('registers a single versioned internal route at INBOX_ACTIONS_URL', () => {
      expect(router.versioned.get).toHaveBeenCalledTimes(1);
      const [config] = router.versioned.get.mock.calls[0];
      expect(config).toMatchObject({
        path: INBOX_ACTIONS_URL,
        access: INTERNAL_API_ACCESS,
        security: { authz: { requiredPrivileges: [PLUGIN_ID] } },
      });
    });

    it('registers the handler under the v1 internal API version', () => {
      // Will throw if the version is missing.
      expect(() => getHandler(router)).not.toThrow();
    });
  });

  describe('response shape', () => {
    it('returns all stub actions under default pagination', async () => {
      const response = await invokeHandler(router);
      const body = getOkBody(response);

      expect(body.total).toBe(STUB_INBOX_ACTIONS.length);
      expect(body.actions).toEqual(STUB_INBOX_ACTIONS);
    });

    it('produces a response that conforms to ListInboxActionsResponse', async () => {
      const response = await invokeHandler(router);
      const body = getOkBody(response);

      // Shape validation — will throw with a clear error if handler output
      // drifts from the OpenAPI-generated schema.
      expect(() => ListInboxActionsResponse.parse(body)).not.toThrow();
    });
  });

  describe('filtering', () => {
    it('filters by status', async () => {
      const body = getOkBody(await invokeHandler(router, { status: 'approved' }));

      expect(body.actions.map((action) => action.status)).toEqual(['approved']);
      expect(body.total).toBe(body.actions.length);
    });

    it('filters by source_app', async () => {
      const body = getOkBody(await invokeHandler(router, { source_app: 'evals' }));

      expect(body.actions.every((action) => action.source_app === 'evals')).toBe(true);
      expect(body.total).toBe(body.actions.length);
    });

    it('combines status and source_app filters', async () => {
      const body = getOkBody(
        await invokeHandler(router, { status: 'approved', source_app: 'evals' })
      );

      expect(
        body.actions.every(
          (action) => action.status === 'approved' && action.source_app === 'evals'
        )
      ).toBe(true);
    });

    it('returns an empty list when no actions match', async () => {
      const body = getOkBody(await invokeHandler(router, { source_app: 'does-not-exist' }));

      expect(body.actions).toEqual([]);
      expect(body.total).toBe(0);
    });
  });

  describe('pagination', () => {
    it('honors page and per_page and reports the pre-pagination total', async () => {
      const body = getOkBody(await invokeHandler(router, { page: 2, per_page: 2 }));

      expect(body.total).toBe(STUB_INBOX_ACTIONS.length);
      expect(body.actions).toEqual(STUB_INBOX_ACTIONS.slice(2, 4));
    });

    it('returns an empty page when page is past the last record but keeps total accurate', async () => {
      const body = getOkBody(await invokeHandler(router, { page: 99, per_page: 2 }));

      expect(body.actions).toEqual([]);
      expect(body.total).toBe(STUB_INBOX_ACTIONS.length);
    });

    it('applies pagination after filtering so total reflects the filtered set', async () => {
      const body = getOkBody(
        await invokeHandler(router, { status: 'pending', page: 1, per_page: 2 })
      );

      const pendingCount = STUB_INBOX_ACTIONS.filter(
        (action) => action.status === 'pending'
      ).length;
      expect(body.total).toBe(pendingCount);
      expect(body.actions).toHaveLength(Math.min(2, pendingCount));
      expect(body.actions.every((action) => action.status === 'pending')).toBe(true);
    });
  });
});
