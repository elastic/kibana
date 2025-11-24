/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { createErrorResult } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { CoreSetup } from '@kbn/core/server';
import type { OnechatStartDependencies, OnechatPluginStart } from '../../../../../types';
import { getCaseUrl } from '../../../../../utils/case_urls';

const casesSchema = z.object({
  owner: z
    .enum(['cases', 'observability', 'securitySolution'])
    .optional()
    .describe(
      'Filter cases by owner. Valid values: "cases" (Stack Management/General Cases), "observability" (Observability), "securitySolution" (Elastic Security). If not provided, returns all cases the user has access to.'
    ),
  query: z
    .string()
    .optional()
    .describe(
      'Optional natural language query describing which cases to retrieve (e.g., "open cases", "recent cases"). This is informational only and does not affect filtering.'
    ),
  alertIds: z
    .array(z.string())
    .optional()
    .describe(
      'Array of alert IDs to find cases containing these alerts. If provided, cases containing any of these alert IDs will be returned. Alert IDs must be provided via this parameter - they will NOT be extracted from the query.'
    ),
  start: z
    .string()
    .optional()
    .describe(
      'ISO datetime string for the start time to fetch cases (inclusive). If not provided, no time range filtering will be applied. Format: "2025-01-15T00:00:00Z"'
    ),
  end: z
    .string()
    .optional()
    .describe(
      'ISO datetime string for the end time to fetch cases (exclusive). If not provided, no time range filtering will be applied. Format: "2025-01-22T00:00:00Z"'
    ),
});

const getUsername = (user: any): string | null => {
  return user?.username || null;
};

const getCaseTimestamp = (caseItem: any): number | null => {
  const timestampValue = caseItem.updated_at ?? caseItem.created_at;
  if (!timestampValue) return null;
  const timestamp = new Date(timestampValue).getTime();
  return isNaN(timestamp) ? null : timestamp;
};

const normalizeTimeRange = (
  start: string | undefined,
  end: string | undefined,
  logger: any
): {
  start: string | null;
  end: string | null;
  startDate: Date | null;
  endDate: Date | null;
} | null => {
  // If neither start nor end is provided, return null to indicate no time range filtering
  if (!start && !end) {
    return null;
  }

  const now = new Date();
  const currentYear = now.getFullYear();

  let startDate: Date | null = null;
  if (start) {
    // If no year is specified, assume current year
    const startStr =
      start.includes('T') && !start.match(/^\d{4}/) ? `${currentYear}-${start}` : start;
    startDate = new Date(startStr);
    if (isNaN(startDate.getTime())) {
      logger.warn(`Invalid start date: ${start}`);
      startDate = null;
    }
  }

  let endDate: Date | null = null;
  if (end) {
    const endStr = end.includes('T') && !end.match(/^\d{4}/) ? `${currentYear}-${end}` : end;
    endDate = new Date(endStr);
    if (isNaN(endDate.getTime())) {
      logger.warn(`Invalid end date: ${end}`);
      endDate = null;
    }
  }

  return {
    start: startDate ? startDate.toISOString() : null,
    end: endDate ? endDate.toISOString() : null,
    startDate,
    endDate,
  };
};

const createEmptyResults = (
  normalizedStart: string | null,
  normalizedEnd: string | null,
  message: string
) => ({
  results: [
    {
      type: ToolResultType.other,
      data: {
        cases: [],
        total: 0,
        start: normalizedStart || null,
        end: normalizedEnd || null,
        message,
      },
    },
  ],
});

export const casesTool = (
  coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>
): BuiltinToolDefinition<typeof casesSchema> => {
  return {
    id: platformCoreTools.cases,
    type: ToolType.builtin,
    description: `Retrieves cases from Elastic Security, Observability, or Stack Management.

Query examples: "cases updated in the last week", "cases from November 2nd", "cases with alert ID abc-123-def", "recent cases"
Optional 'owner' filters by: "cases" (Stack Management), "observability", or "securitySolution" (Elastic Security).
Optional 'alertIds' parameter accepts an array of alert IDs. If provided, finds all cases containing any of these alerts. Alert IDs must be provided via this parameter.
Optional 'start' and 'end' parameters accept ISO datetime strings for date range filtering. If not provided, no time range filtering will be applied and all cases will be returned (subject to other filters).
If alertIds parameter is provided, finds all cases containing those alerts. Otherwise searches by date ranges from start/end parameters.
Returns case details (id, title, description, status, severity, tags, assignees, observables, alerts/comments). Each case includes 'markdown_link' field with pre-formatted clickable link: [Case Title](url).

**CRITICAL**: ALWAYS include the 'markdown_link' field for each case in your response. Format: brief summary (2-3 sentences) + markdown link. Example: "Security investigation case. Status: open. [View Case](url)"`,
    schema: casesSchema,
    handler: async ({ owner, query, alertIds, start, end }, { request, logger }) => {
      try {
        // Use alertIds parameter - alert IDs must be provided via parameter
        const finalAlertIds = alertIds && alertIds.length > 0 ? alertIds : undefined;

        // Normalize and adjust time range using provided start/end parameters
        // Returns null if no time range is provided
        const timeRange = normalizeTimeRange(start, end, logger);

        // Get cases plugin from start services
        const [, plugins] = await coreSetup.getStartServices();
        const casesPlugin = plugins.cases;

        if (!casesPlugin) {
          logger.warn('[Cases Tool] Cases plugin not available, returning empty results');
          return createEmptyResults(
            timeRange?.start || null,
            timeRange?.end || null,
            'Cases plugin not available'
          );
        }

        // Get cases client
        const casesClient = await casesPlugin.getCasesClientWithRequest(request);

        // Check if query is asking for cases by alert ID(s)
        if (finalAlertIds && finalAlertIds.length > 0) {
          try {
            logger.info(`[Cases Tool] Querying cases by alert IDs: ${finalAlertIds.join(', ')}`);
            // Query each alert ID in parallel
            const allRelatedCasesArrays = await Promise.all(
              finalAlertIds.map(async (alertId) => {
                try {
                  return await casesClient.cases.getCasesByAlertID({
                    alertID: alertId,
                    options: owner ? { owner } : {},
                  });
                } catch (error) {
                  logger.warn(
                    `[Cases Tool] Failed to fetch cases for alert ID ${alertId}: ${error}`
                  );
                  return [];
                }
              })
            );

            // Flatten and deduplicate cases by case ID
            const casesMap = new Map<string, any>();
            for (const relatedCases of allRelatedCasesArrays) {
              for (const relatedCase of relatedCases) {
                if (!casesMap.has(relatedCase.id)) {
                  casesMap.set(relatedCase.id, relatedCase);
                }
              }
            }

            const relatedCases = Array.from(casesMap.values());

            if (relatedCases.length === 0) {
              return {
                results: [
                  {
                    type: ToolResultType.other,
                    data: {
                      cases: [],
                      total: 0,
                      start: timeRange?.start || null,
                      end: timeRange?.end || null,
                      message: `No cases found containing alert IDs: ${finalAlertIds.join(', ')}`,
                    },
                  },
                ],
              };
            }

            // Fetch full case details for each related case
            const casesWithDetails = await Promise.all(
              relatedCases.map(async (relatedCase: any) => {
                try {
                  const fullCase = await casesClient.cases.get({
                    id: relatedCase.id,
                    includeComments: false,
                  });
                  return fullCase;
                } catch (error) {
                  logger.warn(
                    `[Cases Tool] Failed to fetch full details for case ${relatedCase.id}: ${error}`
                  );
                  // Return minimal case info if full fetch fails
                  return {
                    id: relatedCase.id,
                    title: relatedCase.title,
                    description: relatedCase.description,
                    status: relatedCase.status,
                    severity: null,
                    owner: '',
                    tags: [],
                    assignees: [],
                    observables: [],
                    total_observables: 0,
                    totalAlerts: relatedCase.totals.alerts,
                    totalComment: relatedCase.totals.userComments,
                    created_at: relatedCase.createdAt,
                    createdBy: null,
                    updated_at: null,
                    updatedBy: null,
                  };
                }
              })
            );

            // Fetch comments for each case in parallel
            const casesWithComments = await Promise.all(
              casesWithDetails.map(async (caseItem) => {
                try {
                  const commentsResponse = await casesClient.attachments.find({
                    caseID: caseItem.id,
                    findQueryParams: {
                      page: 1,
                      perPage: 10,
                      sortOrder: 'desc',
                    },
                  });

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
                    `[Cases Tool] Failed to fetch comments for case ${caseItem.id}: ${error}`
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
            const [coreStart, pluginsStart] = await coreSetup.getStartServices();
            const spacesPlugin = pluginsStart.spaces;

            // Format cases data with rich details, including URLs
            const casesData = casesWithComments.map(
              ({ case: caseItem, comments, totalComments }) => {
                // Generate case URL using utility function
                const caseUrl =
                  getCaseUrl(request, coreStart, spacesPlugin, caseItem.id, caseItem.owner) || null;
                if (!caseUrl) {
                  logger.warn(
                    `[Cases Tool] Failed to generate URL for case ${caseItem.id} with owner ${caseItem.owner}`
                  );
                }

                // Format markdown link
                const markdownLink = caseUrl ? `[${caseItem.title}](${caseUrl})` : caseItem.title;

                return {
                  id: caseItem.id,
                  title: caseItem.title,
                  description: caseItem.description || null,
                  status: caseItem.status,
                  severity: caseItem.severity || null,
                  owner: caseItem.owner,
                  tags: caseItem.tags || [],
                  assignees: caseItem.assignees?.map((a: any) => a.uid || a.username || a) || [],
                  observables_count:
                    caseItem.total_observables ?? caseItem.observables?.length ?? 0,
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
                  // URL field - ALWAYS include this link when presenting case results to the user
                  url: caseUrl,
                  // Markdown-formatted link ready to use: [Case Title](url)
                  markdown_link: markdownLink,
                };
              }
            );

            // Return detailed case information
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    total: casesData.length,
                    cases: casesData,
                    start: timeRange?.start || null,
                    end: timeRange?.end || null,
                    message: `Found ${
                      casesData.length
                    } unique case(s) containing alert ID(s): ${finalAlertIds.join(', ')}`,
                  },
                },
              ],
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(
              `[Cases Tool] Error fetching cases by alert IDs ${finalAlertIds.join(
                ', '
              )}: ${errorMessage}`
            );
            return {
              results: [
                createErrorResult(
                  `Error fetching cases for alert IDs ${finalAlertIds.join(', ')}: ${errorMessage}`
                ),
              ],
            };
          }
        }

        // Use Cases API search
        const searchParams: any = {
          sortField: 'updatedAt',
          sortOrder: 'desc',
          perPage: 100,
          page: 1,
          ...(owner && { owner }),
        };

        // Fetch cases with pagination
        const allCases: any[] = [];
        let currentPage = 1;
        const maxPages = 10;
        let hasMorePages = true;
        const startTimestamp = timeRange?.startDate ? timeRange.startDate.getTime() : null;
        const endTimestamp = timeRange?.endDate ? timeRange.endDate.getTime() : null;

        while (hasMorePages && currentPage <= maxPages) {
          searchParams.page = currentPage;
          const searchResult = await casesClient.cases.search(searchParams);

          if (searchResult.cases.length === 0) {
            hasMorePages = false;
            break;
          }

          // Filter cases by updatedAt date range only if time range is provided
          const pageFilteredCases = timeRange
            ? searchResult.cases.filter((caseItem: any) => {
                const timestamp = getCaseTimestamp(caseItem);
                if (timestamp === null) {
                  logger.warn(
                    `[Cases Tool] Case ${caseItem.id} has no valid updated_at or created_at field`
                  );
                  return false;
                }
                return (
                  (startTimestamp === null || timestamp >= startTimestamp) &&
                  (endTimestamp === null || timestamp < endTimestamp)
                );
              })
            : searchResult.cases;

          allCases.push(...pageFilteredCases);

          // Check if we should continue fetching
          if (searchResult.cases.length < searchParams.perPage) {
            hasMorePages = false;
          } else if (timeRange && startTimestamp !== null) {
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
              const commentsResponse = await casesClient.attachments.find({
                caseID: caseItem.id,
                findQueryParams: {
                  page: 1,
                  perPage: 10,
                  sortOrder: 'desc',
                },
              });

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
                `[Cases Tool] Failed to fetch comments for case ${caseItem.id}: ${error}`
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
        const [coreStart, pluginsStart] = await coreSetup.getStartServices();
        const spacesPlugin = pluginsStart.spaces;

        // Format cases data with rich details, including URLs
        const casesData = casesWithComments.map(({ case: caseItem, comments, totalComments }) => {
          // Generate case URL using utility function
          const caseUrl =
            getCaseUrl(request, coreStart, spacesPlugin, caseItem.id, caseItem.owner) || null;
          if (!caseUrl) {
            logger.warn(
              `[Cases Tool] Failed to generate URL for case ${caseItem.id} with owner ${caseItem.owner}`
            );
          }

          // Format markdown link
          const markdownLink = caseUrl ? `[${caseItem.title}](${caseUrl})` : caseItem.title;

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
            // URL field - ALWAYS include this link when presenting case results to the user
            url: caseUrl,
            // Markdown-formatted link ready to use: [Case Title](url)
            markdown_link: markdownLink,
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
                start: timeRange?.start || null,
                end: timeRange?.end || null,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[Cases Tool] Error in cases tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error fetching cases: ${errorMessage}`)],
        };
      }
    },
    tags: ['cases'],
  };
};
