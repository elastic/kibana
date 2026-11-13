/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { registerPageManagementRoutes } from './page_management_routes';
import type { PageRequest, PageResponse, PageSubmissionDeps } from '../../../pages/page_submission';
import {
  getPageForm,
  notFoundPage,
  PAGE_SUBMITTED_QUERY,
  submitPage,
} from '../../../pages/page_submission';
import { EXTERNAL_RESUME_HTML_HEADERS } from '../executions/external_resume_route_helpers';
import type { RouteDependencies } from '../types';

/**
 * The page URL. The space prefix (`/s/{space}`) comes before it, and there is room for a later
 * `/{runId}`. The page id comes before the secret, so the secret is checked against the page
 * alone before the workflow is read.
 */
export const WORKFLOW_PAGE_PATH = '/pages/{workflowId}/{pageId}/k/{secret}';

const PAGE_BODY_MAX_BYTES = 64 * 1024;

const pageParamsSchema = schema.object({
  workflowId: schema.string({ minLength: 1, maxLength: 255 }),
  pageId: schema.string({ minLength: 1, maxLength: 64 }),
  secret: schema.string({ minLength: 1, maxLength: 64 }),
});

// The secret in the URL is the credential. Kibana answers a 401 with a login redirect, so the
// route never asks for a session and answers every miss with the same 404.
const PAGE_SECURITY = {
  authc: {
    enabled: false,
    reason: 'A workflow page is public: the secret in the URL authorizes the request.',
  },
  authz: {
    enabled: false,
    reason: 'A workflow page authorizes by matching the secret hash of the page.',
  },
} as const;

const respond = (response: KibanaResponseFactory, { statusCode, html, location }: PageResponse) =>
  response.custom({
    statusCode,
    bypassErrorFormat: true,
    body: html,
    headers: location
      ? { ...EXTERNAL_RESUME_HTML_HEADERS, location }
      : EXTERNAL_RESUME_HTML_HEADERS,
  });

/** Registers the page routes. Only with `workflowsManagement.pages.enabled`. */
export function registerPageRoutes(routeDeps: RouteDependencies) {
  const { router, workflowsService, spaces, audit, logger } = routeDeps;
  registerPageManagementRoutes(routeDeps);

  const deps: PageSubmissionDeps = {
    arePagesEnabled: () => workflowsService.arePagesEnabled(),
    resolveWorkflowPage: (ref, secret) => workflowsService.resolveWorkflowPage(ref, secret),
    executeWorkflowAsServiceAccount: async (workflow, context) =>
      (await workflowsService.getWorkflowsExecutionEngine()).executeWorkflowAsServiceAccount(
        workflow,
        context
      ),
  };

  const handle = async (
    kind: 'view' | 'submit',
    request: KibanaRequest<{ workflowId: string; pageId: string; secret: string }>,
    response: KibanaResponseFactory,
    run: (pageRequest: PageRequest) => Promise<PageResponse>
  ) => {
    const { workflowId, pageId, secret } = request.params;
    const spaceId = spaces.getSpaceId(request);
    let result: PageResponse;
    let error: unknown;
    try {
      result = await run({ workflowId, pageId, spaceId, secret });
    } catch (e) {
      // Fail closed: an unexpected error looks like any other miss to the visitor.
      logger.warn(`Workflow page request failed [workflowId=${workflowId}]: ${e}`);
      error = e;
      result = { ...notFoundPage('unexpected_error'), outcome: 'error' };
    }
    audit.logPageRequest(request, {
      kind,
      workflowId,
      pageId,
      spaceId,
      outcome: result.outcome,
      reason: result.reason,
      executionId: result.executionId,
      error,
    });
    return respond(response, result);
  };

  router.get(
    {
      path: WORKFLOW_PAGE_PATH,
      security: PAGE_SECURITY,
      options: { access: 'public', excludeFromOAS: true },
      validate: {
        params: pageParamsSchema,
        query: schema.object(
          { [PAGE_SUBMITTED_QUERY]: schema.maybe(schema.literal('1')) },
          { unknowns: 'ignore' }
        ),
      },
    },
    (context, request, response) =>
      handle('view', request, response, (pageRequest) =>
        getPageForm(deps, pageRequest, {
          submitted: request.query[PAGE_SUBMITTED_QUERY] === '1',
        })
      )
  );

  router.post(
    {
      path: WORKFLOW_PAGE_PATH,
      security: PAGE_SECURITY,
      options: {
        access: 'public',
        excludeFromOAS: true,
        // A plain HTML form post has no kbn-xsrf header, and there is no session to protect:
        // the secret in the URL authorizes the request.
        xsrfRequired: false,
        body: { maxBytes: PAGE_BODY_MAX_BYTES, accepts: ['application/x-www-form-urlencoded'] },
      },
      validate: {
        params: pageParamsSchema,
        body: schema.recordOf(schema.string({ maxLength: 256 }), schema.any()),
      },
    },
    (context, request, response) =>
      handle('submit', request, response, (pageRequest) =>
        submitPage(deps, pageRequest, request.body)
      )
  );
}
