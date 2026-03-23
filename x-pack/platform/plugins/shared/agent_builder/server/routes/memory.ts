/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { publicApiPath } from '../../common/constants';
import { AGENT_BUILDER_READ_SECURITY, MEMORY_WRITE_SECURITY } from './route_security';
import { getCurrentSpaceId } from '../utils/spaces';

const memoryPath = `${publicApiPath}/memory`;

export function registerMemoryRoutes({
  router,
  getInternalServices,
  coreSetup,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  const getUser = async (request: KibanaRequest) => {
    const [coreStart] = await coreSetup.getStartServices();
    const authUser = coreStart.security.authc.getCurrentUser(request);
    return authUser?.username ?? 'unknown';
  };

  // Create entry
  router.versioned
    .post({
      path: `${memoryPath}/entries`,
      security: MEMORY_WRITE_SECURITY,
      access: 'public',
      summary: 'Create a memory entry',
      options: { tags: ['memory', 'oas-tag:agent builder'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: schema.object({
              path: schema.string(),
              title: schema.string(),
              content: schema.string(),
              tags: schema.maybe(schema.arrayOf(schema.string())),
            }),
          },
        },
      },
      wrapHandler(async (context, request, response) => {
        const { memory, spaces } = getInternalServices();
        const spaceId = getCurrentSpaceId({ spaces, request });
        const user = await getUser(request);

        const entry = await memory.create({
          ...request.body,
          tags: request.body.tags ?? [],
          space: spaceId,
          user,
        });

        return response.ok({ body: entry });
      })
    );

  // Get entry by ID
  router.versioned
    .get({
      path: `${memoryPath}/entries/{id}`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Get a memory entry by ID',
      options: { tags: ['memory', 'oas-tag:agent builder'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({ id: schema.string() }),
          },
        },
      },
      wrapHandler(async (context, request, response) => {
        const { memory, spaces } = getInternalServices();
        const spaceId = getCurrentSpaceId({ spaces, request });

        const entry = await memory.get({ id: request.params.id, space: spaceId });
        return response.ok({ body: entry });
      })
    );

  // Get entry by path
  router.versioned
    .get({
      path: `${memoryPath}/entries/by-path`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Get a memory entry by path',
      options: { tags: ['memory', 'oas-tag:agent builder'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: schema.object({ path: schema.string() }),
          },
        },
      },
      wrapHandler(async (context, request, response) => {
        const { memory, spaces } = getInternalServices();
        const spaceId = getCurrentSpaceId({ spaces, request });

        const entry = await memory.getByPath({ path: request.query.path, space: spaceId });
        if (!entry) {
          return response.notFound({
            body: { message: `Entry not found at path: ${request.query.path}` },
          });
        }
        return response.ok({ body: entry });
      })
    );

  // Update entry
  router.versioned
    .put({
      path: `${memoryPath}/entries/{id}`,
      security: MEMORY_WRITE_SECURITY,
      access: 'public',
      summary: 'Update a memory entry',
      options: { tags: ['memory', 'oas-tag:agent builder'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({ id: schema.string() }),
            body: schema.object({
              title: schema.maybe(schema.string()),
              content: schema.maybe(schema.string()),
              tags: schema.maybe(schema.arrayOf(schema.string())),
              path: schema.maybe(schema.string()),
              change_summary: schema.maybe(schema.string()),
            }),
          },
        },
      },
      wrapHandler(async (context, request, response) => {
        const { memory, spaces } = getInternalServices();
        const spaceId = getCurrentSpaceId({ spaces, request });
        const user = await getUser(request);

        const entry = await memory.update({
          id: request.params.id,
          ...request.body,
          changeSummary: request.body.change_summary,
          space: spaceId,
          user,
        });
        return response.ok({ body: entry });
      })
    );

  // Delete entry
  router.versioned
    .delete({
      path: `${memoryPath}/entries/{id}`,
      security: MEMORY_WRITE_SECURITY,
      access: 'public',
      summary: 'Delete a memory entry',
      options: { tags: ['memory', 'oas-tag:agent builder'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({ id: schema.string() }),
          },
        },
      },
      wrapHandler(async (context, request, response) => {
        const { memory, spaces } = getInternalServices();
        const spaceId = getCurrentSpaceId({ spaces, request });
        const user = await getUser(request);

        await memory.delete({ id: request.params.id, space: spaceId, user });
        return response.ok({ body: { deleted: true } });
      })
    );

  // Move entry
  router.versioned
    .post({
      path: `${memoryPath}/entries/{id}/move`,
      security: MEMORY_WRITE_SECURITY,
      access: 'public',
      summary: 'Move a memory entry to a new path',
      options: { tags: ['memory', 'oas-tag:agent builder'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({ id: schema.string() }),
            body: schema.object({ new_path: schema.string() }),
          },
        },
      },
      wrapHandler(async (context, request, response) => {
        const { memory, spaces } = getInternalServices();
        const spaceId = getCurrentSpaceId({ spaces, request });
        const user = await getUser(request);

        const entry = await memory.move({
          id: request.params.id,
          newPath: request.body.new_path,
          space: spaceId,
          user,
        });
        return response.ok({ body: entry });
      })
    );

  // Search
  router.versioned
    .post({
      path: `${memoryPath}/search`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Search memory entries',
      options: { tags: ['memory', 'oas-tag:agent builder'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: schema.object({
              query: schema.string(),
              tags: schema.maybe(schema.arrayOf(schema.string())),
              parent_path: schema.maybe(schema.string()),
              size: schema.maybe(schema.number({ min: 1, max: 50 })),
            }),
          },
        },
      },
      wrapHandler(async (context, request, response) => {
        const { memory, spaces } = getInternalServices();
        const spaceId = getCurrentSpaceId({ spaces, request });

        const results = await memory.search({
          query: request.body.query,
          tags: request.body.tags,
          parentPath: request.body.parent_path,
          size: request.body.size,
          space: spaceId,
        });
        return response.ok({ body: { results } });
      })
    );

  // Get tree
  router.versioned
    .get({
      path: `${memoryPath}/tree`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Get memory tree hierarchy',
      options: { tags: ['memory', 'oas-tag:agent builder'] },
    })
    .addVersion(
      { version: '2023-10-31', validate: {} },
      wrapHandler(async (context, request, response) => {
        const { memory, spaces } = getInternalServices();
        const spaceId = getCurrentSpaceId({ spaces, request });

        const tree = await memory.getTree({ space: spaceId });
        return response.ok({ body: { tree } });
      })
    );

  // Get version history
  router.versioned
    .get({
      path: `${memoryPath}/entries/{id}/history`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Get version history for a memory entry',
      options: { tags: ['memory', 'oas-tag:agent builder'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({ id: schema.string() }),
            query: schema.object({
              size: schema.maybe(schema.number({ min: 1, max: 100 })),
            }),
          },
        },
      },
      wrapHandler(async (context, request, response) => {
        const { memory, spaces } = getInternalServices();
        const spaceId = getCurrentSpaceId({ spaces, request });

        const history = await memory.getHistory({
          entryId: request.params.id,
          space: spaceId,
          size: request.query.size,
        });
        return response.ok({ body: { history } });
      })
    );

  // Get specific version
  router.versioned
    .get({
      path: `${memoryPath}/entries/{id}/history/{version}`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Get a specific version of a memory entry',
      options: { tags: ['memory', 'oas-tag:agent builder'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              id: schema.string(),
              version: schema.number(),
            }),
          },
        },
      },
      wrapHandler(async (context, request, response) => {
        const { memory, spaces } = getInternalServices();
        const spaceId = getCurrentSpaceId({ spaces, request });

        const versionRecord = await memory.getVersion({
          entryId: request.params.id,
          version: request.params.version,
          space: spaceId,
        });
        return response.ok({ body: versionRecord });
      })
    );

  // Rollback
  router.versioned
    .post({
      path: `${memoryPath}/entries/{id}/rollback`,
      security: MEMORY_WRITE_SECURITY,
      access: 'public',
      summary: 'Rollback a memory entry to a specific version',
      options: { tags: ['memory', 'oas-tag:agent builder'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({ id: schema.string() }),
            body: schema.object({ version: schema.number() }),
          },
        },
      },
      wrapHandler(async (context, request, response) => {
        const { memory, spaces } = getInternalServices();
        const spaceId = getCurrentSpaceId({ spaces, request });
        const user = await getUser(request);

        const entry = await memory.rollback({
          entryId: request.params.id,
          version: request.body.version,
          space: spaceId,
          user,
        });
        return response.ok({ body: entry });
      })
    );

  // Compaction log
  router.versioned
    .get({
      path: `${memoryPath}/compaction-log`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Get memory compaction log',
      options: { tags: ['memory', 'oas-tag:agent builder'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: schema.object({
              size: schema.maybe(schema.number({ min: 1, max: 100 })),
            }),
          },
        },
      },
      wrapHandler(async (context, request, response) => {
        const { memory, spaces } = getInternalServices();
        const spaceId = getCurrentSpaceId({ spaces, request });

        const log = await memory.getCompactionLog({
          space: spaceId,
          size: request.query.size,
        });
        return response.ok({ body: { log } });
      })
    );
}
