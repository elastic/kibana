/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENT_MEMORY_API_VERSION,
  MAX_MEMORY_ARRAY_LENGTH,
  MAX_MEMORY_ID_LENGTH,
  MAX_MEMORY_TEXT_LENGTH,
  MAX_MEMORY_TITLE_LENGTH,
  MEMORY_WORKFLOW_TYPES,
  apiPrivileges,
  memoryApiPaths,
  type MemoryMaintenanceToggleResponse,
  type MemorySetupResponse,
  type MemoryWorkflowType,
} from '@kbn/agent-memory-common';
import { schema } from '@kbn/config-schema';
import type { KibanaResponseFactory, RequestHandler } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { getMemoryStatus, type ResolveCanManage } from '../lib/status';
import type { MemoryRouteDependencies } from './types';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readMemory] },
};

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeMemory] },
};

const ROUTE_OPTIONS = {
  tags: ['oas-tag:agent memory'],
  availability: { stability: 'experimental' as const },
};

const idString = schema.string({ minLength: 1, maxLength: MAX_MEMORY_ID_LENGTH });
const idArray = schema.arrayOf(idString, { maxSize: MAX_MEMORY_ARRAY_LENGTH });
const contentString = schema.string({ maxLength: MAX_MEMORY_TEXT_LENGTH });

const entryPropertiesSchema = {
  title: schema.string({ minLength: 1, maxLength: MAX_MEMORY_TITLE_LENGTH }),
  content: contentString,
  categories: schema.maybe(idArray),
  references: schema.maybe(idArray),
  tags: schema.maybe(idArray),
};

// `schema.oneOf` needs a fixed-arity tuple, so these are spelled out rather than
// mapped from the shared constants. The literal type annotations make a drift
// between the two a compile error.
const workflowTypeSchema = schema.oneOf([
  schema.literal('consolidation'),
  schema.literal('conversation_scraper'),
  schema.literal('gap_detection'),
]);

const searchModeSchema = schema.oneOf([
  schema.literal('keyword'),
  schema.literal('semantic'),
  schema.literal('hybrid'),
]);

const handleMemoryError = (error: unknown, response: KibanaResponseFactory) => {
  const boom = error as { isBoom?: boolean; output?: { statusCode: number } };
  if (boom?.isBoom && boom.output) {
    return response.customError({
      statusCode: boom.output.statusCode,
      body: { message: (error as Error).message },
    });
  }
  throw error;
};

export const registerMemoryRoutes = ({
  router,
  logger,
  isMemoryEnabled,
  isStorageInstalled,
  getMemoryService,
  getUser,
  getWorkflowsService,
  backgroundActivityGates,
  installStorage,
  installWorkflows,
  resolveCanManage,
}: MemoryRouteDependencies & { resolveCanManage: ResolveCanManage }) => {
  /**
   * Gate on every endpoint. 404 rather than 403: a feature that is switched off
   * should not advertise its own existence.
   */
  const withMemoryEnabled =
    <P, Q, B>(handler: RequestHandler<P, Q, B>): RequestHandler<P, Q, B> =>
    async (ctx, request, response) => {
      if (!isMemoryEnabled()) {
        return response.notFound();
      }
      return handler(ctx, request, response);
    };

  /** Blocks manual curation runs while a host feature (e.g. SigEvents) is paused. */
  const assertNotBlocked = async (response: KibanaResponseFactory) => {
    const gate = await backgroundActivityGates.check();
    if (gate.blocked) {
      return response.customError({
        statusCode: 409,
        body: { message: gate.reason ?? 'Background memory activity is currently paused.' },
      });
    }
    return undefined;
  };

  const version = { version: AGENT_MEMORY_API_VERSION };

  // ── Status & setup ──

  router.versioned
    .get({
      path: memoryApiPaths.status,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get the state of agent memory',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      { ...version, validate: false },
      // Deliberately not gated: the UI needs to distinguish "switched off" from
      // "never set up", and a 404 cannot say which.
      async (ctx, request, response) => {
        return response.ok({
          body: await getMemoryStatus({
            request,
            isMemoryEnabled,
            isStorageInstalled,
            workflowsService: getWorkflowsService(),
            resolveCanManage,
          }),
        });
      }
    );

  router.versioned
    .post({
      path: memoryApiPaths.setup,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Set up agent memory',
      description:
        'Creates the memory data streams and enables the background curation workflows. Idempotent.',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      { ...version, validate: false },
      withMemoryEnabled(async (ctx, request, response) => {
        const warnings: string[] = [];

        try {
          await installStorage();
        } catch (error) {
          // Reported as a warning, not a failure: the status in the same response
          // shows storage as missing, and the caller can retry.
          warnings.push(`Could not create memory storage: ${(error as Error).message}`);
        }

        try {
          // Installing is idempotent, and retrying here is the point: the attempt at
          // plugin start no-ops if Elasticsearch was not ready yet.
          await installWorkflows();
        } catch (error) {
          warnings.push(`Could not install curation workflows: ${(error as Error).message}`);
        }

        const failures = await getWorkflowsService().setEnabled({
          types: [...MEMORY_WORKFLOW_TYPES],
          enabled: true,
          request,
        });
        warnings.push(...failures.map((failure) => `${failure.type}: ${failure.message}`));

        const body: MemorySetupResponse = {
          status: await getMemoryStatus({
            request,
            isMemoryEnabled,
            isStorageInstalled,
            workflowsService: getWorkflowsService(),
            resolveCanManage,
          }),
          warnings,
        };
        // Always 200. A workflow that has not finished installing is an ordinary
        // post-restart race, and surfacing it as a 503 makes setup look broken.
        return response.ok({ body });
      })
    );

  // ── Entries ──

  router.versioned
    .post({
      path: memoryApiPaths.entries,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Create a memory page',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        ...version,
        validate: {
          request: { body: schema.object({ name: idString, ...entryPropertiesSchema }) },
        },
      },
      withMemoryEnabled(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        try {
          const entry = await getMemoryService(esClient).create({
            ...request.body,
            categories: request.body.categories ?? [],
            references: request.body.references ?? [],
            tags: request.body.tags ?? [],
            user: await getUser(request, esClient),
          });
          return response.ok({ body: entry });
        } catch (error) {
          return handleMemoryError(error, response);
        }
      })
    );

  router.versioned
    .get({
      path: memoryApiPaths.entryByName,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get a memory page by name',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      { ...version, validate: { request: { query: schema.object({ name: idString }) } } },
      withMemoryEnabled(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const entry = await getMemoryService(esClient).getByName({ name: request.query.name });
        if (!entry) {
          return response.notFound({
            body: { message: `Memory page "${request.query.name}" not found` },
          });
        }
        return response.ok({ body: entry });
      })
    );

  router.versioned
    .get({
      path: memoryApiPaths.entryById,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get a memory page',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      { ...version, validate: { request: { params: schema.object({ id: idString }) } } },
      withMemoryEnabled(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        try {
          return response.ok({
            body: await getMemoryService(esClient).get({ id: request.params.id }),
          });
        } catch (error) {
          return handleMemoryError(error, response);
        }
      })
    );

  router.versioned
    .put({
      path: memoryApiPaths.entryById,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Update a memory page',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        ...version,
        validate: {
          request: {
            params: schema.object({ id: idString }),
            body: schema.object({
              name: schema.maybe(idString),
              title: schema.maybe(schema.string({ maxLength: MAX_MEMORY_TITLE_LENGTH })),
              content: schema.maybe(contentString),
              categories: schema.maybe(idArray),
              references: schema.maybe(idArray),
              tags: schema.maybe(idArray),
              change_summary: schema.maybe(schema.string({ maxLength: MAX_MEMORY_TITLE_LENGTH })),
            }),
          },
        },
      },
      withMemoryEnabled(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const { change_summary: changeSummary, ...rest } = request.body;
        try {
          const entry = await getMemoryService(esClient).update({
            id: request.params.id,
            ...rest,
            changeSummary,
            user: await getUser(request, esClient),
          });
          return response.ok({ body: entry });
        } catch (error) {
          return handleMemoryError(error, response);
        }
      })
    );

  router.versioned
    .delete({
      path: memoryApiPaths.entryById,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Delete a memory page',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      { ...version, validate: { request: { params: schema.object({ id: idString }) } } },
      withMemoryEnabled(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        try {
          await getMemoryService(esClient).delete({
            id: request.params.id,
            user: await getUser(request, esClient),
          });
          return response.ok({ body: { deleted: true } });
        } catch (error) {
          return handleMemoryError(error, response);
        }
      })
    );

  // ── Search & browse ──

  router.versioned
    .post({
      path: memoryApiPaths.search,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Search memory pages',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        ...version,
        validate: {
          request: {
            body: schema.object({
              query: schema.string({ maxLength: 1000 }),
              tags: schema.maybe(idArray),
              categories: schema.maybe(idArray),
              references: schema.maybe(idArray),
              size: schema.maybe(schema.number({ min: 1, max: 50 })),
              mode: schema.maybe(searchModeSchema),
            }),
          },
        },
      },
      withMemoryEnabled(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const results = await getMemoryService(esClient).search(request.body);
        return response.ok({ body: { results } });
      })
    );

  router.versioned
    .get({
      path: memoryApiPaths.categories,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Browse memory pages by category',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      { ...version, validate: false },
      withMemoryEnabled(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        return response.ok({ body: await getMemoryService(esClient).getCategoryTree() });
      })
    );

  // ── History ──

  router.versioned
    .get({
      path: memoryApiPaths.entryHistory,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get the version history of a memory page',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        ...version,
        validate: {
          request: {
            params: schema.object({ id: idString }),
            query: schema.object({ size: schema.maybe(schema.number({ min: 1, max: 100 })) }),
          },
        },
      },
      withMemoryEnabled(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const history = await getMemoryService(esClient).getHistory({
          entryId: request.params.id,
          size: request.query.size,
        });
        return response.ok({ body: { history } });
      })
    );

  router.versioned
    .get({
      path: memoryApiPaths.entryHistoryVersion,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get one version of a memory page',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        ...version,
        validate: {
          request: {
            params: schema.object({ id: idString, version: schema.number({ min: 1 }) }),
          },
        },
      },
      withMemoryEnabled(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        try {
          return response.ok({
            body: await getMemoryService(esClient).getVersion({
              entryId: request.params.id,
              version: request.params.version,
            }),
          });
        } catch (error) {
          return handleMemoryError(error, response);
        }
      })
    );

  router.versioned
    .get({
      path: memoryApiPaths.recentChanges,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get recent changes across memory pages',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        ...version,
        validate: {
          request: {
            query: schema.object({ size: schema.maybe(schema.number({ min: 1, max: 100 })) }),
          },
        },
      },
      withMemoryEnabled(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const changes = await getMemoryService(esClient).getRecentChanges({
          size: request.query.size,
        });
        return response.ok({ body: { changes } });
      })
    );

  // ── Maintenance ──

  const toggleResponse = async (
    request: Parameters<ResolveCanManage>[0],
    failures: Array<{ type: MemoryWorkflowType; message: string }>
  ): Promise<MemoryMaintenanceToggleResponse> => ({
    status: await getMemoryStatus({
      request,
      isMemoryEnabled,
      isStorageInstalled,
      workflowsService: getWorkflowsService(),
      resolveCanManage,
    }),
    failures,
  });

  router.versioned
    .put({
      path: memoryApiPaths.maintenanceEnabled,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Enable or disable all background memory curation',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      { ...version, validate: { request: { body: schema.object({ enabled: schema.boolean() }) } } },
      withMemoryEnabled(async (ctx, request, response) => {
        // Enabling counts as starting background activity; disabling must stay
        // possible even while paused.
        if (request.body.enabled) {
          const blocked = await assertNotBlocked(response);
          if (blocked) return blocked;
        }
        const failures = await getWorkflowsService().setEnabled({
          types: [...MEMORY_WORKFLOW_TYPES],
          enabled: request.body.enabled,
          request,
        });
        return response.ok({ body: await toggleResponse(request, failures) });
      })
    );

  router.versioned
    .put({
      path: memoryApiPaths.maintenanceWorkflowEnabled,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Enable or disable one background memory workflow',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        ...version,
        validate: {
          request: {
            params: schema.object({ type: workflowTypeSchema }),
            body: schema.object({ enabled: schema.boolean() }),
          },
        },
      },
      withMemoryEnabled(async (ctx, request, response) => {
        if (request.body.enabled) {
          const blocked = await assertNotBlocked(response);
          if (blocked) return blocked;
        }
        const failures = await getWorkflowsService().setEnabled({
          types: [request.params.type as MemoryWorkflowType],
          enabled: request.body.enabled,
          request,
        });
        return response.ok({ body: await toggleResponse(request, failures) });
      })
    );

  router.versioned
    .post({
      path: memoryApiPaths.maintenanceWorkflowRun,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Run one background memory workflow now',
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        ...version,
        validate: { request: { params: schema.object({ type: workflowTypeSchema }) } },
      },
      withMemoryEnabled(async (ctx, request, response) => {
        const blocked = await assertNotBlocked(response);
        if (blocked) return blocked;
        try {
          const executionId = await getWorkflowsService().run({
            type: request.params.type as MemoryWorkflowType,
            request,
          });
          return response.ok({ body: { executionId } });
        } catch (error) {
          logger.warn(`Could not run memory workflow: ${(error as Error).message}`);
          return response.customError({
            statusCode: 503,
            body: { message: (error as Error).message },
          });
        }
      })
    );
};
