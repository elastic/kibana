/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getSpaceNPRE, PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import type { ProjectTagsResponse } from '@kbn/cps-utils';
import type { CpsData } from '../types';

export const resolveCpsData = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  logger: Logger
): Promise<CpsData> => {
  const npreName = getSpaceNPRE(spaceId);

  try {
    const [npreResponse, tagsResponse] = await Promise.all([
      esClient.transport
        .request<{ expression: string }>({
          method: 'GET',
          path: `/_project_routing/${npreName}`,
        })
        .catch((error: { meta?: { statusCode?: number } }) => {
          if (error?.meta?.statusCode === 404) {
            return { expression: PROJECT_ROUTING_ALL };
          }
          throw error;
        }),
      esClient.transport
        .request<ProjectTagsResponse>({
          method: 'POST',
          path: '/_project/tags',
          body: { project_routing: npreName },
        })
        .catch(() => undefined),
    ]);

    return {
      resolvedExpression: npreResponse.expression,
      linkedProjects: tagsResponse?.linked_projects
        ? Object.values(tagsResponse.linked_projects).map(
            ({ _id, _alias, _type, _organisation }) => ({
              id: _id,
              alias: _alias,
              type: _type,
              organisation: _organisation,
            })
          )
        : [],
    };
  } catch (e) {
    logger.warn(`Failed to resolve CPS data: ${e instanceof Error ? e.message : String(e)}`);
    return { linkedProjects: [] };
  }
};
