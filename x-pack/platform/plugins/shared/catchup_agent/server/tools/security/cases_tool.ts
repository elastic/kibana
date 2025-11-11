/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { createErrorResult } from '@kbn/onechat-server';
import { getCaseUrl } from '../utils/kibana_urls';
import { getPluginServices } from '../../services/service_locator';
import { normalizeTimeRange } from '../utils/date_normalization';

const getUsername = (user: any): string | null => {
  return user?.username || null;
};

const getCaseTimestamp = (caseItem: any): number | null => {
  const timestampValue = caseItem.updated_at ?? caseItem.created_at;
  if (!timestampValue) return null;
  const timestamp = new Date(timestampValue).getTime();
  return isNaN(timestamp) ? null : timestamp;
};
const createEmptyResults = (
  normalizedStart: string,
  normalizedEnd: string | null,
  message: string
) => ({
  results: [
    {
      type: ToolResultType.other,
      data: {
        cases: [],
        total: 0,
        start: normalizedStart,
        end: normalizedEnd || null,
        message,
      },
    },
  ],
});

const casesSchema = z.object({
  start: z
    .string()
    .describe(
      'ISO datetime string for the start time to fetch cases (inclusive). If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
  end: z
    .string()
    .optional()
    .describe(
      'ISO datetime string for the end time to fetch cases (exclusive). If not provided, defaults to now. If no year is specified (e.g., "11-02T00:00:00Z"), the current year is assumed. Use this to filter for a specific date range (e.g., for "November 2", use start="11-02T00:00:00Z" and end="11-03T00:00:00Z")'
    ),
  owner: z
    .enum(['cases', 'observability', 'securitySolution'])
    .optional()
    .describe(
      'Filter cases by owner. Valid values: "cases" (Stack Management/General Cases), "observability" (Observability), "securitySolution" (Elastic Security). If not provided, returns all cases the user has access to.'
    ),
});

export const casesTool = (): BuiltinToolDefinition<typeof casesSchema> => {
  return {
    id: 'hackathon.catchup.cases',
    type: ToolType.builtin,
    description: `Retrieves recently updated cases from Elastic Security, Observability, or Stack Management since a given timestamp.

The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
The optional 'end' parameter allows filtering to a specific date range. For example, to get cases updated on November 2, use start="11-02T00:00:00Z" and end="11-03T00:00:00Z" (current year will be used).
The optional 'owner' parameter filters cases by owner: "cases" (Stack Management/General Cases), "observability" (Observability), or "securitySolution" (Elastic Security). If not provided, returns all cases the user has access to.
Returns cases with detailed information including id, title, description, status, severity, tags, assignees, observables, total alerts/comments, and recent comments. Each case includes a URL for direct access.

**IMPORTANT**: When presenting case results to the user, provide a short paragraph summary (2-3 sentences) describing the key details of each case, then include a clickable link to the case using the provided URL.`,
    schema: casesSchema,
    handler: async ({ start, end, owner }, { request, logger }) => {
      try {
        // Normalize and adjust time range using helper function
        const timeRange = normalizeTimeRange(start, end, { logger });

        const { plugin } = getPluginServices();

        // Use Cases API to fetch cases updated since the given date
        if (!plugin.getCasesClient) {
          logger.warn('[CatchUp Agent] Cases plugin not available, returning empty results');
          return createEmptyResults(timeRange.start, timeRange.end, 'Cases plugin not available');
        }

        const casesClient = await plugin.getCasesClient(request);

        // Use Cases API search
        // Note: The 'from' and 'to' parameters filter by 'created_at', not 'updated_at'
        // So we won't use them and will filter by updatedAt client-side instead
        // We'll fetch multiple pages to ensure we get all cases that might have been updated
        const searchParams: any = {
          sortField: 'updatedAt',
          sortOrder: 'desc',
          perPage: 100, // Fetch 100 cases per page
          page: 1,
          ...(owner && { owner }), // Add owner filter if provided
        };

        // Fetch cases with pagination to ensure we get all cases
        // Since we're filtering by updatedAt client-side, we need to fetch enough cases
        // to cover the date range. We'll fetch pages until we've gone past the start date.
        const allCases: any[] = [];
        let currentPage = 1;
        const maxPages = 10; // Limit to prevent infinite loops
        let hasMorePages = true;
        const startTimestamp = timeRange.startDate.getTime();
        const endTimestamp = timeRange.endDate ? timeRange.endDate.getTime() : null;

        while (hasMorePages && currentPage <= maxPages) {
          searchParams.page = currentPage;
          const searchResult = await casesClient.cases.search(searchParams);

          if (searchResult.cases.length === 0) {
            hasMorePages = false;
            break;
          }

          // Filter cases by updatedAt date range
          // Note: If a case has never been updated, updated_at will be null
          // In that case, we should use created_at as the timestamp to check
          const pageFilteredCases = searchResult.cases.filter((caseItem) => {
            const timestamp = getCaseTimestamp(caseItem);

            if (timestamp === null) {
              logger.warn(
                `[CatchUp Agent] Case ${caseItem.id} has no valid updated_at or created_at field`
              );
              return false;
            }

            return (
              timestamp >= startTimestamp && (endTimestamp === null || timestamp < endTimestamp)
            );
          });

          allCases.push(...pageFilteredCases);

          // Check if we should continue fetching:
          // - If we got fewer cases than perPage, we've reached the end
          // - If the oldest case in this page is before our start date, we can stop
          //   (since we're sorting by updatedAt desc)
          if (searchResult.cases.length < searchParams.perPage) {
            hasMorePages = false;
          } else {
            // Check if the last case in this page is before our start date
            const lastCase = searchResult.cases[searchResult.cases.length - 1];
            const lastCaseTimestamp = getCaseTimestamp(lastCase);
            if (lastCaseTimestamp !== null && lastCaseTimestamp < startTimestamp) {
              hasMorePages = false;
            }
          }

          currentPage++;
        }

        // Fetch comments for each case in parallel
        const casesWithComments = await Promise.all(
          allCases.map(async (caseItem) => {
            try {
              // Fetch comments for this case
              const commentsResponse = await casesClient.attachments.find({
                caseID: caseItem.id,
                findQueryParams: {
                  page: 1,
                  perPage: 10, // Limit to 10 most recent comments per case
                  sortOrder: 'desc',
                },
              });

              // The response has 'comments' field which is an array of Attachment objects
              // Filter for user comments only and extract summaries
              const commentSummaries = (commentsResponse.comments || [])
                .filter((att: any) => att.type === 'user')
                .slice(0, 5)
                .map((comment: any) => ({
                  id: comment.id,
                  comment: comment.comment?.substring(0, 200) || '',
                  created_by: getUsername(comment.createdBy || comment.created_by),
                  created_at: comment.createdAt || comment.created_at || null,
                }));

              return {
                case: caseItem,
                comments: commentSummaries,
                totalComments: commentsResponse.total || 0,
              };
            } catch (error) {
              logger.warn(
                `[CatchUp Agent] Failed to fetch comments for case ${caseItem.id}: ${error}`
              );
              return {
                case: caseItem,
                comments: [],
                totalComments: 0,
              };
            }
          })
        );

        // Get core services for generating case URLs
        const { core } = getPluginServices();

        // Format cases data with rich details, including URLs
        const casesData = casesWithComments.map(({ case: caseItem, comments, totalComments }) => {
          // Generate case URL using the case's owner
          const caseUrl = getCaseUrl(request, core, caseItem.id, caseItem.owner);

          return {
            id: caseItem.id,
            title: caseItem.title,
            description: caseItem.description || null,
            status: caseItem.status,
            severity: caseItem.severity || null,
            owner: caseItem.owner,
            tags: caseItem.tags || [],
            assignees: caseItem.assignees?.map((a: any) => a.uid || a.username || a) || [],
            observables_count: caseItem.total_observables ?? caseItem.observables?.length ?? 0,
            observables: (caseItem.observables || []).slice(0, 5).map((obs: any) => ({
              type: obs.typeKey || obs.type || null,
              value: obs.value || null,
            })),
            total_alerts: caseItem.totalAlerts || 0,
            total_comments: totalComments,
            created_by: getUsername(caseItem.createdBy || caseItem.created_by),
            created_at: caseItem.created_at || null,
            updated_by: getUsername(caseItem.updatedBy || caseItem.updated_by),
            updated_at: caseItem.updated_at || caseItem.created_at || null,
            comments_summary: comments,
            url: caseUrl,
          };
        });

        // Return detailed case information
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total: casesData.length,
                cases: casesData,
                start: timeRange.start,
                end: timeRange.end,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(`[CatchUp Agent] Error in cases tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error fetching cases: ${errorMessage}`)],
        };
      }
    },
    tags: ['security', 'cases'],
  };
};
