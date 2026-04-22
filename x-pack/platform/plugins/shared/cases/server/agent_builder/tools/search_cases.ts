/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { CoreSetup } from '@kbn/core/server';
import type { CasesClient } from '../../client';
import type { CasesServerStartDependencies } from '../../types';
import { getCaseStepCommonDefinition } from '../../../common/workflows/steps/get_case';
import { getCasesStepCommonDefinition } from '../../../common/workflows/steps/get_cases';
import { findCasesStepCommonDefinition } from '../../../common/workflows/steps/find_cases';
import type { CasesFindRequest } from '../../../common/types/api';
import type { Case, RelatedCase } from '../../../common/types/domain';
import {
  createCommentSummariesFromArray,
  enhanceCaseData,
  createResult,
  createErrorResponse,
  deduplicateCases,
  fetchAllPages,
  type CoreServices,
  type EnhancedCaseData,
} from './search_cases_helpers';

const casesSchema = z.object({
  ...getCaseStepCommonDefinition.inputSchema.partial().shape,
  ...getCasesStepCommonDefinition.inputSchema.partial().shape,
  ...findCasesStepCommonDefinition.inputSchema.partial().shape,
  // Custom fields not in any step schema:
  similar_to_case_id: z
    .string()
    .optional()
    .describe('Find cases similar to this case ID based on shared observables.'),
  alert_ids: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Array of alert IDs to find cases containing these alerts. Cases containing any of these alert IDs will be returned.'
    ),
  // include_comments, owner, assignees, from, to, search: descriptions inherited from step schemas
});

async function fetchCaseById(
  caseId: string,
  casesClient: CasesClient,
  includeComments: boolean,
  request: KibanaRequest,
  coreServices: CoreServices,
  logger: Logger
): Promise<EnhancedCaseData> {
  const theCase = await casesClient.cases.get({
    id: caseId,
    includeComments,
  });

  const commentsSummary =
    includeComments && theCase.comments
      ? createCommentSummariesFromArray(theCase.comments)
      : undefined;

  return enhanceCaseData(theCase, commentsSummary, request, coreServices, logger);
}

async function fetchCasesByAlertIds(
  alertIds: string[],
  casesClient: CasesClient,
  owner: string | undefined,
  includeComments: boolean,
  logger: Logger
): Promise<Case[]> {
  const allRelatedCasesArrays = await Promise.all(
    alertIds.map(async (alertId) => {
      try {
        return await casesClient.cases.getCasesByAlertID({
          alertID: alertId,
          options: owner ? { owner } : {},
        });
      } catch (error) {
        logger.warn(`[Cases Tool] Failed to fetch cases for alert ID ${alertId}: ${error}`);
        return [];
      }
    })
  );

  const relatedCases: RelatedCase[] = deduplicateCases(allRelatedCasesArrays);

  if (relatedCases.length === 0) {
    return [];
  }

  const caseFetchResults = await Promise.allSettled(
    relatedCases.map((relatedCase) =>
      casesClient.cases.get({
        id: relatedCase.id,
        includeComments,
      })
    )
  );

  return caseFetchResults.flatMap((result, index) => {
    if (result.status === 'fulfilled') {
      return [result.value];
    }
    logger.warn(
      `[Cases Tool] Failed to fetch full details for case ${relatedCases[index].id}: ${result.reason}`
    );
    return [];
  });
}

function enhanceCases(
  cases: Case[],
  includeComments: boolean,
  request: KibanaRequest,
  coreServices: CoreServices,
  logger: Logger
): EnhancedCaseData[] {
  return cases.map((theCase) => {
    const commentsSummary =
      includeComments && theCase.comments
        ? createCommentSummariesFromArray(theCase.comments)
        : undefined;

    return enhanceCaseData(theCase, commentsSummary, request, coreServices, logger);
  });
}

export const searchCasesTool = (
  coreSetup: CoreSetup<CasesServerStartDependencies>,
  getCasesClientFn: (request: KibanaRequest) => Promise<CasesClient>
): BuiltinToolDefinition<typeof casesSchema> => {
  return {
    id: platformCoreTools.cases,
    type: ToolType.builtin,
    description: `Retrieves cases from Elastic Security, Observability, or Stack Management. Supports five operation modes:

**Mode 1: Get case by ID**
- Provide \`case_id\` to retrieve a specific case
- Use \`include_comments\` to fetch comments (default: false)

**Mode 2: Bulk get by IDs**
- Provide \`case_ids\` (array) to retrieve multiple cases at once

**Mode 3: Find similar cases**
- Provide \`similar_to_case_id\` to find cases with shared observables
- Use \`page\`/\`perPage\` for pagination

**Mode 4: Find cases by alert IDs**
- Provide \`alert_ids\` (array) to find cases containing any of those alerts

**Mode 5: Search / filter cases**
- Use search and filter parameters: \`search\`, \`severity\`, \`status\`, \`tags\`, \`assignees\`, \`reporters\`, \`category\`, \`owner\`, \`from\`, \`to\`, \`searchFields\`
- Set \`include_comments: true\` when the query is about case contents or discussions

Returns case details with \`markdown_link\` (pre-formatted clickable link). **CRITICAL**: Always include the \`markdown_link\` in your response for each case. Format: "Brief summary. [View Case](url)"`,
    schema: casesSchema,
    handler: async (
      {
        case_id,
        case_ids,
        similar_to_case_id,
        alert_ids,
        owner,
        from,
        to,
        search,
        searchFields,
        severity,
        sortField,
        sortOrder,
        status,
        tags,
        assignees,
        reporters,
        category,
        include_comments,
        page,
        perPage,
      },
      { request, spaceId, logger }
    ) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();
        const coreServices: CoreServices = { coreStart, spaceId };

        const casesClient = await getCasesClientFn(request);
        const shouldIncludeComments = include_comments ?? false;

        // Mode 2: Bulk get by IDs
        if (case_ids && case_ids.length > 0) {
          logger.info(`[Cases Tool] Bulk-getting ${case_ids.length} cases`);
          const bulkResult = await casesClient.cases.bulkGet({ ids: case_ids });
          const enrichedCases = enhanceCases(
            bulkResult.cases,
            shouldIncludeComments,
            request,
            coreServices,
            logger
          );
          return createResult(
            enrichedCases,
            null,
            `Retrieved ${enrichedCases.length} case(s)${bulkResult.errors.length > 0 ? `, ${bulkResult.errors.length} error(s)` : ''}`
          );
        }

        // Mode 3: Find similar cases
        if (similar_to_case_id) {
          logger.info(`[Cases Tool] Finding cases similar to: ${similar_to_case_id}`);
          const similarResult = await casesClient.cases.similar(similar_to_case_id, {
            page: page ?? 1,
            perPage: perPage ?? 20,
          });
          return {
            results: [
              {
                type: 'other' as const,
                data: similarResult,
              },
            ],
          };
        }

        // Mode 4: Find by alert IDs
        if (alert_ids && alert_ids.length > 0) {
          logger.info(`[Cases Tool] Querying cases by alert IDs: ${alert_ids.join(', ')}`);
          const cases = await fetchCasesByAlertIds(
            alert_ids,
            casesClient,
            owner as string | undefined,
            shouldIncludeComments,
            logger
          );

          if (cases.length === 0) {
            return createResult(
              [],
              null,
              `No cases found containing alert IDs: ${alert_ids.join(', ')}`
            );
          }

          const casesData = enhanceCases(cases, shouldIncludeComments, request, coreServices, logger);
          return createResult(
            casesData,
            null,
            `Found ${casesData.length} unique case(s) containing alert ID(s): ${alert_ids.join(', ')}`
          );
        }

        // Mode 1: Get case by ID
        if (case_id) {
          logger.info(`[Cases Tool] Getting case by ID: ${case_id}`);
          const caseData = await fetchCaseById(
            case_id,
            casesClient,
            shouldIncludeComments,
            request,
            coreServices,
            logger
          );
          return createResult([caseData], null, `Retrieved case: ${caseData.title}`);
        }

        // Mode 5: Search / filter
        const searchParams: CasesFindRequest = {
          sortField: (sortField as CasesFindRequest['sortField']) ?? 'updatedAt',
          sortOrder: sortOrder ?? 'desc',
          perPage: 100,
          page: 1,
          ...(owner && { owner }),
          ...(search && { search }),
          ...(searchFields && { searchFields: searchFields as CasesFindRequest['searchFields'] }),
          ...(severity && { severity: severity as CasesFindRequest['severity'] }),
          ...(status && { status: status as CasesFindRequest['status'] }),
          ...(tags && { tags }),
          ...(assignees && { assignees }),
          ...(reporters && { reporters }),
          ...(category && { category }),
          ...(from && { from }),
          ...(to && { to }),
        };

        const allCases = await fetchAllPages(casesClient, searchParams);
        const casesData = enhanceCases(
          allCases,
          shouldIncludeComments,
          request,
          coreServices,
          logger
        );
        return createResult(casesData, null);
      } catch (error) {
        return createErrorResponse(
          error,
          '[Cases Tool] Error in cases tool',
          'Error fetching cases',
          logger
        );
      }
    },
    tags: ['cases'],
  };
};
