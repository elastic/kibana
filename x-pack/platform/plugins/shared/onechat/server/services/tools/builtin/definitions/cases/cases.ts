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
  // Get case by ID operation
  caseId: z
    .string()
    .optional()
    .describe(
      'Case ID to retrieve a specific case. If provided, returns only that case. Use this for getting a single case by its ID.'
    ),
  // Find cases by alert IDs
  alertIds: z
    .array(z.string())
    .optional()
    .describe(
      'Array of alert IDs to find cases containing these alerts. If provided, cases containing any of these alert IDs will be returned. Alert IDs must be provided via this parameter.'
    ),
  // Owner filter
  owner: z
    .enum(['cases', 'observability', 'securitySolution'])
    .optional()
    .describe(
      'Filter cases by owner. Valid values: "cases" (Stack Management/General Cases), "observability" (Observability), "securitySolution" (Elastic Security). If not provided, returns all cases the user has access to.'
    ),
  // Date range filters
  start: z
    .string()
    .optional()
    .describe(
      'ISO datetime string for the start time to fetch cases (inclusive). Maps to Cases API "from" parameter. Format: "2025-01-15T00:00:00Z"'
    ),
  end: z
    .string()
    .optional()
    .describe(
      'ISO datetime string for the end time to fetch cases (exclusive). Maps to Cases API "to" parameter. Format: "2025-01-22T00:00:00Z"'
    ),
  // Search parameters
  search: z
    .string()
    .optional()
    .describe(
      'Elasticsearch simple_query_string query for searching case title and description. Use this to search for text within cases (e.g., "malware", "phishing attack").'
    ),
  searchFields: z
    .array(z.enum(['title', 'description']))
    .optional()
    .describe(
      'Fields to perform the search query against. Valid values: "title", "description". If not provided, searches both fields by default.'
    ),
  // Filter parameters
  severity: z
    .union([
      z.enum(['low', 'medium', 'high', 'critical']),
      z.array(z.enum(['low', 'medium', 'high', 'critical'])),
    ])
    .optional()
    .describe(
      'Filter cases by severity. Valid values: "low", "medium", "high", "critical". Can be a single value or an array for multiple values.'
    ),
  status: z
    .union([
      z.enum(['open', 'closed', 'in-progress']),
      z.array(z.enum(['open', 'closed', 'in-progress'])),
    ])
    .optional()
    .describe(
      'Filter cases by status. Valid values: "open", "closed", "in-progress". Can be a single value or an array for multiple values.'
    ),
  tags: z
    .array(z.string())
    .optional()
    .describe('Filter cases by tags. Provide an array of tag names to filter by.'),
  assignees: z
    .array(z.string())
    .optional()
    .describe('Filter cases by assignees. Provide an array of user profile UIDs (not usernames).'),
  reporters: z
    .array(z.string())
    .optional()
    .describe(
      'Filter cases by reporters. Provide an array of reporter usernames who created the cases.'
    ),
  category: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe(
      'Filter cases by category. Can be a single category string or an array of categories.'
    ),
  // Comments control
  includeComments: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Whether to fetch and include case comments in the response. Set to true when the query is about case contents, details, discussions, or when search text might match comment content. Defaults to false for metadata-only queries (status, severity, tags, etc.).'
    ),
});

const getUsername = (user: any): string | null => {
  return user?.username || null;
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

const extractErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

const createCommentSummary = (comment: any) => ({
  id: comment.id,
  comment: comment.comment?.substring(0, 200) || '',
  created_by: getUsername(comment.createdBy || comment.created_by),
  created_at: comment.createdAt || comment.created_at || null,
});

const createCommentSummariesFromArray = (comments: any[]): any[] => {
  return comments
    .filter((att: any) => att.type === 'user')
    .slice(0, 5)
    .map(createCommentSummary);
};

interface CommentFetchResult {
  case: any;
  comments: any[];
  totalComments: number;
}

const fetchCommentsForCase = async (
  caseItem: any,
  casesClient: any,
  logger: any
): Promise<CommentFetchResult> => {
  try {
    const commentsResponse = await casesClient.attachments.find({
      caseID: caseItem.id,
      findQueryParams: {
        page: 1,
        perPage: 10,
        sortOrder: 'desc',
      },
    });

    const commentSummaries = createCommentSummariesFromArray(commentsResponse.comments || []);

    return {
      case: caseItem,
      comments: commentSummaries,
      totalComments: commentsResponse.total || 0,
    };
  } catch (error) {
    logger.warn(`[Cases Tool] Failed to fetch comments for case ${caseItem.id}: ${error}`);
    return {
      case: caseItem,
      comments: [],
      totalComments: caseItem.totalComment || 0,
    };
  }
};

const fetchCommentsForCases = async (
  cases: any[],
  casesClient: any,
  shouldFetch: boolean,
  logger: any
): Promise<CommentFetchResult[]> => {
  return Promise.all(
    cases.map(async (caseItem) => {
      if (!shouldFetch) {
        return {
          case: caseItem,
          comments: [],
          totalComments: caseItem.totalComment || 0,
        };
      }
      return fetchCommentsForCase(caseItem, casesClient, logger);
    })
  );
};

interface CoreServices {
  coreStart: any;
  spacesPlugin: any;
}

const getCoreServices = async (
  coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>
): Promise<CoreServices> => {
  const [coreStart, pluginsStart] = await coreSetup.getStartServices();
  return {
    coreStart,
    spacesPlugin: pluginsStart.spaces,
  };
};

interface EnhancedCaseData {
  [key: string]: any;
  url: string | null;
  markdown_link: string;
}

const enhanceCaseData = (
  caseItem: any,
  comments: any[],
  totalComments: number,
  request: any,
  coreServices: CoreServices,
  logger: any
): EnhancedCaseData => {
  const caseUrl =
    getCaseUrl(
      request,
      coreServices.coreStart,
      coreServices.spacesPlugin,
      caseItem.id,
      caseItem.owner
    ) || null;
  if (!caseUrl) {
    logger.warn(
      `[Cases Tool] Failed to generate URL for case ${caseItem.id} with owner ${caseItem.owner}`
    );
  }

  const markdownLink = caseUrl ? `[${caseItem.title}](${caseUrl})` : caseItem.title;

  return {
    ...caseItem,
    assignees: caseItem.assignees?.map((a: any) => a.uid || a.username || a) || [],
    observables_count: caseItem.total_observables ?? caseItem.observables?.length ?? 0,
    observables: (caseItem.observables || []).slice(0, 5).map((obs: any) => ({
      type: obs.typeKey || obs.type || null,
      value: obs.value || null,
    })),
    total_alerts: caseItem.totalAlerts || 0,
    total_comments: totalComments,
    created_by: getUsername(caseItem.createdBy || caseItem.created_by),
    updated_by: getUsername(caseItem.updatedBy || caseItem.updated_by),
    comments_summary: comments,
    url: caseUrl,
    markdown_link: markdownLink,
  };
};

const createToolResult = (
  cases: EnhancedCaseData[],
  timeRange: ReturnType<typeof normalizeTimeRange> | null,
  message?: string
) => ({
  results: [
    {
      type: ToolResultType.other,
      data: {
        total: cases.length,
        cases,
        start: timeRange?.start || null,
        end: timeRange?.end || null,
        ...(message && { message }),
      },
    },
  ],
});

const enhanceCasesWithComments = async (
  casesWithComments: CommentFetchResult[],
  coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>,
  request: any,
  logger: any
): Promise<EnhancedCaseData[]> => {
  const coreServices = await getCoreServices(coreSetup);
  return casesWithComments.map(({ case: caseItem, comments, totalComments }) =>
    enhanceCaseData(caseItem, comments, totalComments, request, coreServices, logger)
  );
};

const createErrorResponse = (
  error: unknown,
  logPrefix: string,
  userMessage: string,
  logger: any
) => {
  const errorMessage = extractErrorMessage(error);
  logger.error(`${logPrefix}: ${errorMessage}`);
  return {
    results: [createErrorResult(`${userMessage}: ${errorMessage}`)],
  };
};

const getCasesClient = async (
  coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>,
  request: any,
  logger: any,
  timeRange: ReturnType<typeof normalizeTimeRange> | null
): Promise<{ casesClient: any } | { error: ReturnType<typeof createEmptyResults> }> => {
  const [, plugins] = await coreSetup.getStartServices();
  const casesPlugin = plugins.cases;

  if (!casesPlugin) {
    logger.warn('[Cases Tool] Cases plugin not available, returning empty results');
    return {
      error: createEmptyResults(
        timeRange?.start || null,
        timeRange?.end || null,
        'Cases plugin not available'
      ),
    };
  }

  const casesClient = await casesPlugin.getCasesClientWithRequest(request);
  return { casesClient };
};

const deduplicateCases = (casesArrays: any[][]): any[] => {
  const casesMap = new Map<string, any>();
  for (const relatedCases of casesArrays) {
    for (const relatedCase of relatedCases) {
      if (!casesMap.has(relatedCase.id)) {
        casesMap.set(relatedCase.id, relatedCase);
      }
    }
  }
  return Array.from(casesMap.values());
};

const createMinimalCaseFromRelatedCase = (relatedCase: any) => ({
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
});

export const casesTool = (
  coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>
): BuiltinToolDefinition<typeof casesSchema> => {
  return {
    id: platformCoreTools.cases,
    type: ToolType.builtin,
    description: `Retrieves cases from Elastic Security, Observability, or Stack Management. Supports three operation modes:

**Operation Mode 1: Get case by ID**
- Provide 'caseId' parameter to retrieve a specific case by its ID
- Use 'includeComments' to control whether comments are fetched (default: false)

**Operation Mode 2: Find cases by alert IDs**
- Provide 'alertIds' array to find all cases containing any of these alerts
- Use 'includeComments' or provide 'search' text to fetch comments when relevant

**Operation Mode 3: Search cases**
- Use search and filter parameters to find cases matching criteria
- Search parameters:
  - 'search': Text query for searching case title/description (e.g., "malware", "phishing attack")
  - 'searchFields': Fields to search - ["title"] or ["description"] or both (default: both)
- Filter parameters:
  - 'severity': Filter by severity - "low" | "medium" | "high" | "critical" (single or array)
  - 'status': Filter by status - "open" | "closed" | "in-progress" (single or array)
  - 'tags': Filter by tags - array of tag names
  - 'assignees': Filter by assignees - array of user profile UIDs
  - 'reporters': Filter by reporters - array of reporter usernames
  - 'category': Filter by category - string or array
  - 'owner': Filter by owner - "cases" | "observability" | "securitySolution"
- Date range:
  - 'start': ISO datetime string for start time (inclusive), maps to Cases API "from"
  - 'end': ISO datetime string for end time (exclusive), maps to Cases API "to"
- Comments:
  - 'includeComments': Set to true when query is about case contents, details, discussions, or when search text might match comment content
  - Defaults to false for metadata-only queries (status, severity, tags, etc.)
  - Automatically set to true if 'search' text is provided

**Examples:**
- "Get case abc-123": { caseId: "abc-123", includeComments: false }
- "Find cases with alert ID xyz": { alertIds: ["xyz"] }
- "High severity open cases": { severity: "high", status: "open" }
- "Cases about malware": { search: "malware", includeComments: true }
- "Cases with tag security from last week": { tags: ["security"], start: "2025-01-15T00:00:00Z" }

Returns case details (id, title, description, status, severity, tags, assignees, observables, alerts/comments). Each case includes 'markdown_link' field with pre-formatted clickable link: [Case Title](url).

**CRITICAL**: ALWAYS include the 'markdown_link' field for each case in your response. Format: brief summary (2-3 sentences) + markdown link. Example: "Security investigation case. Status: open. [View Case](url)"`,
    schema: casesSchema,
    handler: async (
      {
        caseId,
        alertIds,
        owner,
        start,
        end,
        search,
        searchFields,
        severity,
        status,
        tags,
        assignees,
        reporters,
        category,
        includeComments,
      },
      { request, logger }
    ) => {
      try {
        // Normalize and adjust time range using provided start/end parameters
        // Returns null if no time range is provided
        const timeRange = normalizeTimeRange(start, end, logger);

        // Get cases client
        const casesClientResult = await getCasesClient(coreSetup, request, logger, timeRange);
        if ('error' in casesClientResult) {
          return casesClientResult.error;
        }
        const { casesClient } = casesClientResult;

        // Operation mode 1: Get case by ID
        if (caseId) {
          try {
            logger.info(`[Cases Tool] Getting case by ID: ${caseId}`);
            const theCase = await casesClient.cases.get({
              id: caseId,
              includeComments: includeComments ?? false,
            });

            const coreServices = await getCoreServices(coreSetup);
            const commentsSummary =
              includeComments && theCase.comments
                ? createCommentSummariesFromArray(theCase.comments)
                : [];

            const caseData = enhanceCaseData(
              theCase,
              commentsSummary,
              theCase.totalComment || 0,
              request,
              coreServices,
              logger
            );

            return createToolResult([caseData], null, `Retrieved case: ${theCase.title}`);
          } catch (error) {
            return createErrorResponse(
              error,
              `[Cases Tool] Error fetching case by ID ${caseId}`,
              `Error fetching case ${caseId}`,
              logger
            );
          }
        }

        // Operation mode 2: Find cases by alert ID(s)
        const finalAlertIds = alertIds && alertIds.length > 0 ? alertIds : undefined;
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
            const relatedCases = deduplicateCases(allRelatedCasesArrays);

            if (relatedCases.length === 0) {
              return createEmptyResults(
                timeRange?.start || null,
                timeRange?.end || null,
                `No cases found containing alert IDs: ${finalAlertIds.join(', ')}`
              );
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
                  return createMinimalCaseFromRelatedCase(relatedCase);
                }
              })
            );

            const shouldFetchCommentsForAlertIds = includeComments;
            const casesWithComments = await fetchCommentsForCases(
              casesWithDetails,
              casesClient,
              shouldFetchCommentsForAlertIds,
              logger
            );

            const casesData = await enhanceCasesWithComments(
              casesWithComments,
              coreSetup,
              request,
              logger
            );

            return createToolResult(
              casesData,
              timeRange,
              `Found ${
                casesData.length
              } unique case(s) containing alert ID(s): ${finalAlertIds.join(', ')}`
            );
          } catch (error) {
            return createErrorResponse(
              error,
              `[Cases Tool] Error fetching cases by alert IDs ${finalAlertIds.join(', ')}`,
              `Error fetching cases for alert IDs ${finalAlertIds.join(', ')}`,
              logger
            );
          }
        }

        // Operation mode 3: Search cases using Cases API
        // Build search parameters from schema parameters
        const searchParams: any = {
          sortField: 'updatedAt',
          sortOrder: 'desc',
          perPage: 100,
          page: 1,
          ...(owner && { owner }),
          ...(search && { search }),
          ...(searchFields && searchFields.length > 0 && { searchFields }),
          ...(severity && { severity }),
          ...(status && { status }),
          ...(tags && tags.length > 0 && { tags }),
          ...(assignees && assignees.length > 0 && { assignees }),
          ...(reporters && reporters.length > 0 && { reporters }),
          ...(category && { category }),
          ...(timeRange?.start && { from: timeRange.start }),
          ...(timeRange?.end && { to: timeRange.end }),
        };

        // Fetch cases with pagination
        const allCases: any[] = [];
        let currentPage = 1;
        const maxPages = 10;
        let hasMorePages = true;

        while (hasMorePages && currentPage <= maxPages) {
          searchParams.page = currentPage;
          const searchResult = await casesClient.cases.search(searchParams);

          if (searchResult.cases.length === 0) {
            hasMorePages = false;
            break;
          }

          allCases.push(...searchResult.cases);

          // Check if we should continue fetching
          if (searchResult.cases.length < searchParams.perPage) {
            hasMorePages = false;
          }

          currentPage++;
        }

        const shouldFetchCommentsForSearch = includeComments;
        const casesWithComments = await fetchCommentsForCases(
          allCases,
          casesClient,
          shouldFetchCommentsForSearch,
          logger
        );

        const casesData = await enhanceCasesWithComments(
          casesWithComments,
          coreSetup,
          request,
          logger
        );

        return createToolResult(casesData, timeRange);
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
