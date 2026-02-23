/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createErrorResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CasesClient } from '@kbn/cases-plugin/server/client';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import type {
  Case,
  Attachment,
  RelatedCase,
  UserCommentAttachment,
} from '@kbn/cases-plugin/common/types/domain';
import type { CasesFindRequest } from '@kbn/cases-plugin/common/types/api';
import { getCurrentSpaceId } from '@kbn/agent-builder-plugin/server/utils/spaces';
import { getCaseViewPath } from '@kbn/cases-plugin/server/common/utils';
import type { PluginStartDependencies } from '../../types';

export interface CommentSummary {
  id: string;
  comment: string;
  created_by: string | null;
  created_at: string | null;
}

export interface CoreServices {
  coreStart: CoreStart;
  spacesPlugin: SpacesPluginStart | undefined;
}

export interface EnhancedCaseData extends Case {
  url: string | null;
  markdown_link: string;
  comments_summary?: CommentSummary[];
}

/**
 * Normalizes and validates time range parameters for case queries.
 * Validates ISO date strings and logs warnings for invalid dates.
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
  if (!start && !end) {
    return null;
  }

  let startDate: Date | null = null;
  if (start) {
    startDate = new Date(start);
    if (isNaN(startDate.getTime())) {
      logger.warn(`Invalid start date: ${start}`);
      startDate = null;
    }
  }

  let endDate: Date | null = null;
  if (end) {
    endDate = new Date(end);
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
 * Creates a standardized tool result response for the cases tool.
 * Handles success, empty, and error cases.
 *
 * @param cases - Array of enhanced case data objects (empty array for empty results)
 * @param timeRange - Normalized time range object or null if no time filtering
 * @param message - Optional message to include in the response
 * @returns Tool result object conforming to ToolResultType.other format
 */
export const createResult = (
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
 * Fetches all pages of cases from a search query.
 * Handles pagination automatically up to a maximum number of pages.
 *
 * @param casesClient - The cases client instance for API calls
 * @param searchParams - Search parameters for the query
 * @param maxPages - Maximum number of pages to fetch (default: 10)
 * @returns Promise resolving to array of all cases from all pages
 */
export const fetchAllPages = async (
  casesClient: CasesClient,
  searchParams: CasesFindRequest,
  maxPages: number = 10
): Promise<Case[]> => {
  const allCases: Case[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages && currentPage <= maxPages) {
    searchParams.page = currentPage;
    const searchResult = await casesClient.cases.find(searchParams);

    if (searchResult.cases.length === 0) {
      break;
    }

    allCases.push(...searchResult.cases);

    // Stop if we got fewer results than requested (last page)
    if (searchResult.cases.length < (searchParams.perPage ?? 100)) {
      hasMorePages = false;
    }

    currentPage++;
  }

  return allCases;
};

/**
 * Enhances a case object with URL and markdown link fields.
 *
 * @param caseItem - The base case object from the API
 * @param comments - Optional array of comment summaries to include
 * @param request - Kibana request object for URL generation
 * @param coreServices - Core services including CoreStart and SpacesPlugin
 * @param logger - Logger instance for warning messages
 * @returns Enhanced case data object with url and markdown_link fields
 */
export const enhanceCaseData = (
  caseItem: Case,
  comments: CommentSummary[] | undefined,
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
    url: caseUrl,
    markdown_link: markdownLink,
    ...(comments && comments.length > 0 && { comments_summary: comments }),
  };
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
  const errorMessage = error instanceof Error ? error.message : String(error);
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
  pluginsStart: PluginStartDependencies,
  request: KibanaRequest,
  logger: Logger,
  timeRange: ReturnType<typeof normalizeTimeRange> | null
): Promise<{ casesClient: CasesClient } | { error: ReturnType<typeof createResult> }> => {
  const casesPlugin = pluginsStart.cases;

  if (!casesPlugin) {
    logger.warn('[Cases Tool] Cases plugin not available, returning empty results');
    return {
      error: createResult([], timeRange, 'Cases plugin not available'),
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

// CASE URL

/**
 * App routes for different Kibana applications
 */
const APP_ROUTES = {
  security: '/app/security',
  observability: '/app/observability',
  management: '/app/management/insightsAndAlerting',
} as const;

/**
 * Get the app route based on owner/case type
 */
function getAppRoute(owner: string): string {
  const ownerToRoute: Record<string, string> = {
    securitySolution: APP_ROUTES.security,
    observability: APP_ROUTES.observability,
    cases: APP_ROUTES.management,
  };
  return ownerToRoute[owner] || APP_ROUTES.management;
}

/**
 * Build a full URL from base components
 */
function buildFullUrl(
  request: KibanaRequest,
  core: CoreStart,
  spaceId: string,
  path: string
): string {
  const publicBaseUrl = core.http.basePath.publicBaseUrl;
  const serverBasePath = core.http.basePath.serverBasePath;

  // First try using publicBaseUrl if configured
  if (publicBaseUrl) {
    const pathWithSpace = addSpaceIdToPath(serverBasePath, spaceId, path);
    return `${publicBaseUrl}${pathWithSpace}`;
  }

  // Fallback: construct URL from request
  const protocol = request.headers['x-forwarded-proto'] || 'http';
  const host = request.headers.host || 'localhost:5601';
  const baseUrl = `${protocol}://${host}`;
  const pathWithSpace = addSpaceIdToPath(serverBasePath, spaceId, path);

  return `${baseUrl}${pathWithSpace}`;
}

/**
 * Generate a URL to a case
 */
export function getCaseUrl(
  request: KibanaRequest,
  core: CoreStart,
  spaces: SpacesPluginStart | undefined,
  caseId: string,
  owner: string
): string | null {
  try {
    const spaceId = getCurrentSpaceId({ request, spaces });
    const publicBaseUrl = core.http.basePath.publicBaseUrl;

    // getCaseViewPath returns a full URL when publicBaseUrl is provided
    if (publicBaseUrl) {
      return getCaseViewPath({
        publicBaseUrl,
        spaceId,
        caseId,
        owner,
      });
    }

    // Fallback: construct URL manually
    const appRoute = getAppRoute(owner);
    const path = `${appRoute}/cases/${caseId}`;
    return buildFullUrl(request, core, spaceId, path);
  } catch (error) {
    return null;
  }
}
