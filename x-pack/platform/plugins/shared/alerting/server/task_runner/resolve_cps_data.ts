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
import type { CpsData, CpsLinkedProject } from '../types';

/**
 * Resolves the CPS scope metadata (routing expression + linked projects) recorded on alert
 * documents and the event log.
 *
 * The two Elasticsearch endpoints require different principals:
 * - `/_project_routing/{npre}` resolves the space's routing expression. It is space configuration,
 *   identical for every principal, and an operator-only endpoint, so it is called with the
 *   internal (operator) user. This is reliable and avoids the `security_exception` a rule's scoped
 *   API key would otherwise raise (see #276771).
 * - `/_project/tags` returns the linked projects visible to the caller (role-filtered). To reflect
 *   the scope the rule execution actually targets (its owner's project visibility), it is called as
 *   the current user. If the call fails, linked projects are reported as unresolved (`undefined`)
 *   rather than as an empty array, so consumers can distinguish "unknown" from "genuinely none in
 *   scope" (see #285277).
 */
export const resolveCpsData = async (
  internalUserEsClient: ElasticsearchClient,
  currentUserEsClient: ElasticsearchClient,
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

    let linkedProjects: CpsLinkedProject[] | undefined;
    try {
      const tagsResponse = await currentUserEsClient.transport.request<ProjectTagsResponse>({
        method: 'GET',
        path: '/_project/tags',
        body: { project_routing: resolvedExpression },
      });
      linkedProjects = tagsResponse.linked_projects
        ? Object.values(tagsResponse.linked_projects).map(
            ({ _id, _alias, _type, _organisation }) => ({
              id: _id,
              alias: _alias,
              type: _type,
              organization: _organisation,
            })
          )
        : [];
    } catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 401 || statusCode === 403) {
        // The rule's execution principal cannot list linked projects. This typically means the
        // run fell back to a project-scoped ES API key instead of a cross-project-capable UIAM
        // key, so the run could not search linked projects either. Leave linked projects
        // unresolved rather than misreporting an empty scope (see #285277).
        logger.warn(
          `The rule execution principal is not authorized to resolve linked projects via /_project/tags for space "${spaceId}" (status ${statusCode}); the rule may be running with a project-scoped API key. Recording linked projects as unresolved.`
        );
      } else {
        logger.warn(
          `Failed to resolve linked projects via /_project/tags for space "${spaceId}": ${
            error instanceof Error ? error.message : String(error)
          }. Recording linked projects as unresolved.`
        );
      }
    }

    return { resolvedExpression, linkedProjects };
  } catch (e) {
    logger.warn(`Failed to resolve CPS data: ${e instanceof Error ? e.message : String(e)}`);
    return {};
  }
};
