/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getSpaceNPRE, PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import type { ProjectTagsResponse } from '@kbn/cps-utils';
import { brandSpaceId } from '@kbn/core-spaces-common';
import type { CpsData } from '../types';

/**
 * Resolves the CPS scope metadata (routing expression + linked projects) recorded on alert
 * documents and the event log.
 *
 * Both endpoints are called with the internal (operator) user:
 * - `/_project_routing/{npre}` is operator-only and user-agnostic. Using the internal user avoids
 *   the `security_exception` a rule's scoped API key would otherwise raise (see #276771).
 * - `/_project/tags` is also called with the internal user so that linked projects are resolved
 *   from the space's routing scope rather than the rule API key's organisation membership.
 *   A rule's UIAM API key may lack the x-client-authentication context needed for `/_project/tags`
 *   to return linked projects, which would cause pre-execution index validation to incorrectly skip
 *   rules whose indices exist only on linked projects (see #283236). The actual rule search still
 *   uses the scoped API key with `projectRouting: 'space'`, so access control is enforced there.
 */
export const resolveCpsData = async (
  internalUserEsClient: ElasticsearchClient,
  spaceId: string,
  logger: Logger
): Promise<CpsData> => {
  const npreRef = getSpaceNPRE(brandSpaceId(spaceId));
  const npreName = npreRef.replace(/^@/, '');

  try {
    const resolvedExpression = await internalUserEsClient.transport
      .request<{ expression: string }>({
        method: 'GET',
        path: `/_project_routing/${npreName}`,
      })
      .then((res) => res.expression ?? PROJECT_ROUTING_ALL)
      .catch((error: { statusCode?: number }) => {
        // A missing routing expression (404) is a legitimate "no routing configured" case: fall
        // back to the default "all projects" scope silently.
        if (error?.statusCode === 404) {
          return PROJECT_ROUTING_ALL;
        }
        // The internal user should always be authorized for this operator-only endpoint, so a 403
        // signals a misconfiguration rather than an expected condition. Fall back to the default
        // scope so rule execution is not broken, but surface it so the problem is not hidden.
        if (error?.statusCode === 403) {
          logger.warn(
            `Unexpected 403 resolving project routing for space "${spaceId}"; the internal user should be authorized for /_project_routing. Falling back to all projects.`
          );
          return PROJECT_ROUTING_ALL;
        }
        throw error;
      });

    const tagsResponse = await internalUserEsClient.transport
      .request<ProjectTagsResponse>({
        method: 'GET',
        path: '/_project/tags',
        body: { project_routing: resolvedExpression },
      })
      .catch(() => undefined);

    const linkedProjects = tagsResponse?.linked_projects
      ? Object.values(tagsResponse.linked_projects).map(
          ({ _id, _alias, _type, _organisation }) => ({
            id: _id,
            alias: _alias,
            type: _type,
            organization: _organisation,
          })
        )
      : [];

    return { resolvedExpression, linkedProjects };
  } catch (e) {
    logger.warn(`Failed to resolve CPS data: ${e instanceof Error ? e.message : String(e)}`);
    return { linkedProjects: [] };
  }
};
