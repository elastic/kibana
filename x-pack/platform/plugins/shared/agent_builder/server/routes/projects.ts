/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ProjectType } from '@kbn/agent-builder-common';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import type {
  CreateProjectFromCaseBody,
  GetProjectResponse,
  ListProjectsResponse,
} from '../../common/http_api/projects';
import { apiPrivileges } from '../../common/features';
import { publicApiPath } from '../../common/constants';

export function registerProjectRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.versioned
    .get({
      path: `${publicApiPath}/projects`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'List Agent Builder projects',
      options: {
        tags: ['project', 'oas-tag:agent builder'],
        availability: { since: '9.3.0' },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: schema.object({
              type: schema.maybe(schema.string()),
              case_id: schema.maybe(schema.string()),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { projects: projectsService } = getInternalServices();
        const client = await projectsService.getScopedClient({ request });
        const { type, case_id: caseId } = request.query;
        const results = await client.list({
          type: type as ProjectType | undefined,
          caseId,
        });
        return response.ok<ListProjectsResponse>({ body: { results } });
      })
    );

  router.versioned
    .get({
      path: `${publicApiPath}/projects/{projectId}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Get Agent Builder project',
      options: {
        tags: ['project', 'oas-tag:agent builder'],
        availability: { since: '9.3.0' },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              projectId: schema.string(),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { projects: projectsService } = getInternalServices();
        const client = await projectsService.getScopedClient({ request });
        const project = await client.get(request.params.projectId);
        const knowledge = await projectsService.getKnowledgeSummary({ request, project });
        return response.ok<GetProjectResponse & { knowledge?: unknown }>({
          body: { project, ...(knowledge ? { knowledge } : {}) },
        });
      })
    );

  router.versioned
    .post({
      path: `${publicApiPath}/projects/from_case`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
      access: 'public',
      summary: 'Get or create a case-typed project for a case',
      options: {
        tags: ['project', 'oas-tag:agent builder'],
        availability: { since: '9.3.0' },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: schema.object({
              case_id: schema.string(),
              owner: schema.string(),
              title: schema.maybe(schema.string()),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { projects: projectsService } = getInternalServices();
        const body = request.body as CreateProjectFromCaseBody;
        const project = await projectsService.getOrCreateForCase({
          request,
          caseId: body.case_id,
          owner: body.owner,
          title: body.title,
        });
        return response.ok<GetProjectResponse>({ body: { project } });
      })
    );
}
