/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createErrorResult } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CasesClient } from '@kbn/cases-plugin/server/client';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  Case,
  Attachment,
  RelatedCase,
  UserCommentAttachment,
} from '@kbn/cases-plugin/common/types/domain';
import type { OnechatStartDependencies } from '../../../../../types';
import { getCaseUrl } from '../../../../../utils/case_urls';

export interface CommentSummary {
  id: string;
  comment: string;
  created_by: string | null;
  created_at: string | null;
}

export interface CommentFetchResult {
  case: Case;
  comments: CommentSummary[];
  totalComments: number;
}

export interface CoreServices {
  coreStart: CoreStart;
  spacesPlugin: SpacesPluginStart | undefined;
}

export interface EnhancedCaseData
  extends Omit<
    Case,
    'assignees' | 'observables' | 'totalAlerts' | 'totalComment' | 'created_by' | 'updated_by'
  > {
  url: string | null;
  markdown_link: string;
  assignees: string[];
  observables_count: number;
  observables: Array<{ type: string | null; value: string | null }>;
  total_alerts: number;
  total_comments: number;
  created_by: string | null;
  updated_by: string | null;
  comments_summary: CommentSummary[];
}

/**
 * Normalizes and validates time range parameters for case queries.
 * Handles date strings that may or may not include a year (assumes current year if missing).
 * Validates dates and logs warnings for invalid dates.
 *
 * @param start - ISO datetime string for start time (inclusive), optional
 * @param end - ISO datetime string for end time (exclusive), optional
 * @param logger - Logger instance for warning messages
 * @returns Normalized time range object with ISO strings and Date objects, or null if neither start nor end is provided
 */
export const normalizeTimeRange = (
  start: string | undefined,
  end: string | undefined,
  logger: Logger
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

/**
 * Creates an empty results response for the cases tool.
 * Used when no cases are found or when the cases plugin is unavailable.
 *
 * @param normalizedStart - Normalized start time ISO string, or null
 * @param normalizedEnd - Normalized end time ISO string, or null
 * @param message - Message explaining why results are empty
 * @returns Tool result object with empty cases array and the provided message
 */
export const createEmptyResults = (
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

/**
 * Extracts a human-readable error message from an error object.
 * Handles both Error instances and other error types.
 *
 * @param error - The error object of unknown type
 * @returns The error message string
 */
export const extractErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

/**
 * Creates a summary object from a case attachment/comment.
 * Extracts key information including comment text (truncated to 200 chars),
 * creator username, and creation timestamp.
 *
 * @param comment - The attachment/comment object from the cases API
 * @returns A CommentSummary object with id, comment text, creator, and timestamp
 */
export const createCommentSummary = (comment: Attachment): CommentSummary => {
  const commentText =
    comment.type === 'user' && 'comment' in comment
      ? (comment as UserCommentAttachment).comment?.substring(0, 200) || ''
      : '';
  return {
    id: comment.id,
    comment: commentText,
    created_by: comment.created_by.username ?? comment.created_by.email ?? null,
    created_at: comment.created_at || null,
  };
};

/**
 * Creates comment summaries from an array of attachments.
 * Filters to only user comments, limits to the first 5, and converts to summaries.
 *
 * @param comments - Array of attachment objects from the cases API
 * @returns Array of CommentSummary objects (max 5 user comments)
 */
export const createCommentSummariesFromArray = (comments: Attachment[]): CommentSummary[] => {
  return comments
    .filter((att) => att.type === 'user')
    .slice(0, 5)
    .map(createCommentSummary);
};

/**
 * Fetches comments for a single case using the cases client.
 * Retrieves up to 10 comments sorted by creation date (descending).
 * Returns empty comments array if fetch fails, but still includes the case.
 *
 * @param caseItem - The case object to fetch comments for
 * @param casesClient - The cases client instance for API calls
 * @param logger - Logger instance for error logging
 * @returns Promise resolving to CommentFetchResult with case, comments, and total count
 */
export const fetchCommentsForCase = async (
  caseItem: Case,
  casesClient: CasesClient,
  logger: Logger
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

/**
 * Fetches comments for multiple cases in parallel.
 * If shouldFetch is false, returns cases with empty comment arrays.
 * Otherwise, fetches comments for each case concurrently.
 *
 * @param cases - Array of case objects to fetch comments for
 * @param casesClient - The cases client instance for API calls
 * @param shouldFetch - Whether to actually fetch comments (false returns empty arrays)
 * @param logger - Logger instance for error logging
 * @returns Promise resolving to array of CommentFetchResult objects
 */
export const fetchCommentsForCases = async (
  cases: Case[],
  casesClient: CasesClient,
  shouldFetch: boolean,
  logger: Logger
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

/**
 * Enhances a case object with additional computed fields and formatting.
 * Adds URL generation, markdown links, normalized assignees, observables summary,
 * and comment summaries. Transforms user objects to usernames for display.
 *
 * @param caseItem - The base case object from the API
 * @param comments - Array of comment summaries to include
 * @param totalComments - Total number of comments for the case
 * @param request - Kibana request object for URL generation
 * @param coreServices - Core services including CoreStart and SpacesPlugin
 * @param logger - Logger instance for warning messages
 * @returns Enhanced case data object with all computed fields
 */
export const enhanceCaseData = (
  caseItem: Case,
  comments: CommentSummary[],
  totalComments: number,
  request: KibanaRequest,
  coreServices: CoreServices,
  logger: Logger
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
    assignees: caseItem.assignees?.map((a) => a.uid || String(a)) || [],
    observables_count: caseItem.total_observables ?? caseItem.observables?.length ?? 0,
    observables: (caseItem.observables || []).slice(0, 5).map((obs) => ({
      type: obs.typeKey || null,
      value: obs.value || null,
    })),
    created_by: caseItem.created_by.username ?? caseItem.created_by.email ?? null,
    updated_by: caseItem.updated_by?.username ?? caseItem.updated_by?.email ?? null,
    total_alerts: caseItem.totalAlerts || 0,
    total_comments: totalComments,
    comments_summary: comments,
    url: caseUrl,
    markdown_link: markdownLink,
  };
};

/**
 * Creates a standardized tool result response for the cases tool.
 * Formats the response according to the onechat tool result specification.
 *
 * @param cases - Array of enhanced case data objects
 * @param timeRange - Normalized time range object or null if no time filtering
 * @param message - Optional message to include in the response
 * @returns Tool result object conforming to ToolResultType.other format
 */
export const createToolResult = (
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

/**
 * Enhances multiple cases with comments by applying enhanceCaseData to each.
 * Processes all cases in the array and returns enhanced versions with URLs,
 * markdown links, and formatted fields.
 *
 * @param casesWithComments - Array of CommentFetchResult objects containing cases and their comments
 * @param coreServices - Core services including CoreStart and SpacesPlugin
 * @param request - Kibana request object for URL generation
 * @param logger - Logger instance for warning messages
 * @returns Array of enhanced case data objects
 */
export const enhanceCasesWithComments = (
  casesWithComments: CommentFetchResult[],
  coreServices: CoreServices,
  request: KibanaRequest,
  logger: Logger
): EnhancedCaseData[] => {
  return casesWithComments.map(({ case: caseItem, comments, totalComments }) =>
    enhanceCaseData(caseItem, comments, totalComments, request, coreServices, logger)
  );
};

/**
 * Creates a standardized error response for the cases tool.
 * Extracts error message, logs it with the provided prefix, and returns
 * a tool result with an error message formatted for the user.
 *
 * @param error - The error object of unknown type
 * @param logPrefix - Prefix string for the error log message
 * @param userMessage - User-friendly error message to display
 * @param logger - Logger instance for error logging
 * @returns Tool result object with error information
 */
export const createErrorResponse = (
  error: unknown,
  logPrefix: string,
  userMessage: string,
  logger: Logger
) => {
  const errorMessage = extractErrorMessage(error);
  logger.error(`${logPrefix}: ${errorMessage}`);
  return {
    results: [createErrorResult(`${userMessage}: ${errorMessage}`)],
  };
};

/**
 * Retrieves a cases client instance from the cases plugin.
 * Checks if the cases plugin is available and creates a client scoped to the request.
 * Returns an error result if the plugin is unavailable.
 *
 * @param pluginsStart - Plugin start dependencies containing the cases plugin
 * @param request - Kibana request object for creating a scoped client
 * @param logger - Logger instance for warning messages
 * @param timeRange - Normalized time range for error responses (if plugin unavailable)
 * @returns Promise resolving to either a cases client or an error result object
 */
export const getCasesClient = async (
  pluginsStart: OnechatStartDependencies,
  request: KibanaRequest,
  logger: Logger,
  timeRange: ReturnType<typeof normalizeTimeRange> | null
): Promise<{ casesClient: CasesClient } | { error: ReturnType<typeof createEmptyResults> }> => {
  const casesPlugin = pluginsStart.cases;

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

/**
 * Deduplicates cases across multiple arrays by case ID.
 * Takes an array of case arrays (e.g., from multiple alert ID queries)
 * and returns a single array with unique cases based on their ID.
 *
 * @param casesArrays - Array of arrays containing RelatedCase objects
 * @returns Array of unique RelatedCase objects (first occurrence kept)
 */
export const deduplicateCases = (casesArrays: RelatedCase[][]): RelatedCase[] => {
  const casesMap = new Map<string, RelatedCase>();
  for (const relatedCases of casesArrays) {
    for (const relatedCase of relatedCases) {
      if (!casesMap.has(relatedCase.id)) {
        casesMap.set(relatedCase.id, relatedCase);
      }
    }
  }
  return Array.from(casesMap.values());
};
