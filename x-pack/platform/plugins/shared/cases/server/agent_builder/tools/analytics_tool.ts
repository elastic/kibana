/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { runSearchTool } from '@kbn/agent-builder-genai-utils/tools';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { CoreSetup } from '@kbn/core/server';

import type { CasesServerStartDependencies } from '../../types';
import { OWNERS } from '../../../common/constants';
import { ReadOperations } from '../../authorization/types';
import { getIndicesForSpaceId } from '../../cases_analytics';
import { CASES_ANALYTICS_TOOL_ID } from './constants';

/**
 * Returns a comma-separated list of all cases analytics index names for the given
 * space. Explicit names are used (not a wildcard) because the indices are hidden
 * and are excluded from wildcard expansion by default. The comma also ensures
 * `isIndexPattern()` returns `true` in the search graph.
 */
export const getCasesAnalyticsIndexPattern = (spaceId: string): string => {
  return getIndicesForSpaceId(spaceId).join(',');
};

const buildCustomInstructions = (indexPattern: string): string =>
  `You are querying Kibana Cases analytics indices for a specific space.

IMPORTANT — always use this exact index pattern in ES|QL FROM clauses:
  FROM ${indexPattern}

The indices contain four document types — do not assume a single schema:

1. Case documents
   Key fields: title, description, status (open/in-progress/closed), \
severity (low/medium/high/critical), tags (keyword array), category, assignees (keyword array), \
owner, space_ids, created_at, updated_at, closed_at, \
total_alerts (integer), total_comments (integer), \
time_to_resolve (milliseconds), time_to_acknowledge (milliseconds), \
time_to_investigate (milliseconds), custom_fields (nested array with type/key/value).

2. Comment documents
   Key fields: case_id, comment (full-text), created_by.username, created_at, updated_at, owner, space_ids.

3. Attachment documents
   Key fields: case_id, type (alert or externalReference), \
payload.alerts (array of {id, index}), payload.file ({id, name, extension, mimeType}), \
created_by.username, created_at, owner, space_ids.

4. Activity documents
   Key fields: case_id, action (add/delete/update), \
type (status/severity/tags/category/delete_case), \
payload.status, payload.tags, payload.category, payload.severity, \
created_by.username, created_at, owner, space_ids.

Filtering tips:
- Use owner = 'securitysolution', 'observability', or 'cases' to scope by solution.
- All timestamps are ISO 8601 strings.
- Use STATS aggregations to build summary metrics (counts, averages, distributions).
- For dashboard-style queries, prefer STATS … BY owner, status, severity etc.`;

const analyticsSchema = z.object({
  query: z
    .string()
    .describe(
      'A natural language query about cases data. Can request counts, trends, distributions, ' +
        'aggregations, or open-ended searches across cases, case comments, case attachments, and case activity. ' +
        'Examples: "how many open critical cases per owner", ' +
        '"average time to resolve cases last 30 days", ' +
        '"cases with the most comments this week".'
    ),
});

export const casesAnalyticsTool = (
  core: CoreSetup<CasesServerStartDependencies>,
  logger: Logger
): BuiltinToolDefinition<typeof analyticsSchema> => {
  return {
    id: CASES_ANALYTICS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Search and analyze Kibana Cases data using natural language. ' +
      'Covers cases, comments, attachments, and activity events. ' +
      'Use this tool to count cases, compute resolution times, identify trends, ' +
      'aggregate by status/severity/owner, or build dashboard-style summaries.',
    schema: analyticsSchema,
    handler: async ({ query }, { esClient, spaceId, request, modelProvider, events }) => {
      logger.debug(`cases.analytics tool invoked with query: "${query}", spaceId: "${spaceId}"`);

      // The analytics indices are queried with the internal ES user, so we must
      // explicitly verify the calling user has Cases read access for at least one
      // owner before exposing any data.
      const [, { security }] = await core.getStartServices();
      const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
      const kibanaPrivileges = OWNERS.map((owner) =>
        security.authz.actions.cases.get(owner, ReadOperations.FindCases)
      );
      const { privileges } = await checkPrivileges({ kibana: kibanaPrivileges });

      if (!privileges.kibana.some((p) => p.authorized)) {
        logger.debug(
          `cases.analytics tool: access denied for request — user lacks Cases read privilege`
        );
        throw Boom.forbidden('You do not have access to Cases analytics data.');
      }

      const indexPattern = getCasesAnalyticsIndexPattern(spaceId);
      logger.debug(`cases.analytics tool: querying index pattern "${indexPattern}"`);

      const results = await runSearchTool({
        nlQuery: query,
        index: indexPattern,
        esClient: esClient.asInternalUser,
        model: await modelProvider.getDefaultModel(),
        allowPatternTarget: true,
        customInstructions: buildCustomInstructions(indexPattern),
        events,
        logger,
      });

      return { results };
    },
    tags: ['cases', 'analytics'],
  };
};
