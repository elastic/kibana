/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaResponseFactory } from '@kbn/core/server';
import { workflowPageAccessSchema } from '../../../pages/page_saved_object';
import { WorkflowPageNotFoundError } from '../../../pages/workflow_page_not_found_error';
import { WorkflowPagesUnavailableError } from '../../../pages/workflow_pages_unavailable_error';
import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_EXECUTE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const PAGE_API_PATH = '/internal/workflows/workflow/{id}/pages/{pageId}';

const pageParamsSchema = schema.object({
  id: schema.string({ minLength: 1, maxLength: 255 }),
  pageId: schema.string({ minLength: 1, maxLength: 64 }),
});

// The request base path carries the server base path and the `/s/{space}` prefix.
const buildPageUrl = (basePath: string, workflowId: string, pageId: string, secret: string) =>
  `${basePath}/pages/${encodeURIComponent(workflowId)}/${encodeURIComponent(pageId)}/k/${secret}`;

const NO_STORE = { 'cache-control': 'no-store' } as const;

const handlePageError = (response: KibanaResponseFactory, error: Error) => {
  if (error instanceof WorkflowPageNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (error instanceof WorkflowPagesUnavailableError) {
    return response.conflict({ body: { message: error.message } });
  }
  return handleRouteError(response, error);
};

/**
 * Page operations for authors: read the page with its URL and status, publish it, take it
 * offline, and rotate its secret.
 * The pages client checks the page privileges and the workflow ACL, and audits each call.
 */
export function registerPageManagementRoutes({
  router,
  workflowsService,
  spaces,
}: RouteDependencies) {
  router.versioned
    .get({
      path: PAGE_API_PATH,
      access: 'internal',
      security: WORKFLOW_EXECUTE_SECURITY,
      summary: 'Get a workflow page and its URL',
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: { request: { params: pageParamsSchema } } },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { id: workflowId, pageId } = request.params;
          const client = await workflowsService.getPagesClient(request);
          const page = await client.get({ workflowId, pageId });
          const [secret, status] = await Promise.all([
            client.getSecret({ workflowId, pageId }),
            workflowsService.getWorkflowPageStatus(page, spaces.getSpaceId(request)),
          ]);
          const url = buildPageUrl(request.basePath, workflowId, pageId, secret);
          return response.ok({ body: { ...page, url, status }, headers: NO_STORE });
        } catch (error) {
          return handlePageError(response, error);
        }
      })
    );

  router.versioned
    .put({
      path: `${PAGE_API_PATH}/access`,
      access: 'internal',
      security: WORKFLOW_EXECUTE_SECURITY,
      summary: 'Set the access level of a workflow page',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            params: pageParamsSchema,
            body: schema.object({ access: schema.nullable(workflowPageAccessSchema) }),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { id: workflowId, pageId } = request.params;
          const client = await workflowsService.getPagesClient(request);
          const page = await client.setAccess({ workflowId, pageId }, request.body.access);
          return response.ok({ body: page });
        } catch (error) {
          return handlePageError(response, error);
        }
      })
    );

  router.versioned
    .post({
      path: `${PAGE_API_PATH}/_rotate`,
      access: 'internal',
      security: WORKFLOW_EXECUTE_SECURITY,
      summary: 'Replace the secret of a workflow page',
      description: 'The old URL stops working at once. Returns the new URL.',
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: { request: { params: pageParamsSchema } } },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { id: workflowId, pageId } = request.params;
          const client = await workflowsService.getPagesClient(request);
          const secret = await client.rotateSecret({ workflowId, pageId });
          const url = buildPageUrl(request.basePath, workflowId, pageId, secret);
          return response.ok({ body: { url }, headers: NO_STORE });
        } catch (error) {
          return handlePageError(response, error);
        }
      })
    );

  router.versioned
    .put({
      path: `${PAGE_API_PATH}/enabled`,
      access: 'internal',
      security: WORKFLOW_EXECUTE_SECURITY,
      summary: 'Take a workflow page offline or bring it back online',
      description: 'The URL stays the same. Taking a page offline needs no service account rights.',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: { params: pageParamsSchema, body: schema.object({ enabled: schema.boolean() }) },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { id: workflowId, pageId } = request.params;
          const client = await workflowsService.getPagesClient(request);
          const page = await client.setEnabled({ workflowId, pageId }, request.body.enabled);
          return response.ok({ body: page });
        } catch (error) {
          return handlePageError(response, error);
        }
      })
    );
}
