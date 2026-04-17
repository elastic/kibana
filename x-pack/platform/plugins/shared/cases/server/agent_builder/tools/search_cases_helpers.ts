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
import type { CasesClient } from '../../client';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import type { Case, AttachmentV2, RelatedCase } from '../../../common/types/domain';
import type { CasesFindRequest } from '../../../common/types/api';
import { getCaseViewPath } from '../../common/utils';
import { isLegacyCommentAttachment } from '../../../common/utils/attachments/v1_type_guards';
import { isUnifiedCommentAttachment } from '../../../common/utils/attachments/v2_type_guards';

export interface CommentSummary {
  id: string;
  comment: string;
  created_by: string | null;
  created_at: string | null;
}

export interface CoreServices {
  coreStart: CoreStart;
  /** Space ID for the current request, from ToolHandlerContext.spaceId */
  spaceId: string;
}

export interface EnhancedCaseData extends Case {
  url: string | null;
  markdown_link: string;
  comments_summary?: CommentSummary[];
}

/**
 * Normalizes and validates time range parameters for case queries.
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
 * Creates a standardized tool result response for the cases search tool.
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
 */
export const createCommentSummary = (comment: AttachmentV2): CommentSummary => {
  const commentText = isLegacyCommentAttachment(comment)
    ? comment.comment
    : isUnifiedCommentAttachment(comment)
    ? comment.data.content
    : '';

  return {
    id: comment.id,
    comment: commentText?.substring(0, 200) || '',
    created_by: comment.created_by.username ?? comment.created_by.email ?? null,
    created_at: comment.created_at || null,
  };
};

/**
 * Creates comment summaries from an array of attachments.
 * Filters to only user comments, limits to the first 5.
 */
export const createCommentSummariesFromArray = (comments: AttachmentV2[]): CommentSummary[] => {
  return comments
    .filter((att) => att.type === 'user' || att.type === 'comment')
    .slice(0, 5)
    .map(createCommentSummary);
};

/**
 * Fetches all pages of cases from a search query.
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

    if (searchResult.cases.length < (searchParams.perPage ?? 100)) {
      hasMorePages = false;
    }

    currentPage++;
  }

  return allCases;
};

/**
 * Enhances a case object with URL and markdown link fields.
 */
export const enhanceCaseData = (
  caseItem: Case,
  comments: CommentSummary[] | undefined,
  request: KibanaRequest,
  coreServices: CoreServices,
  logger: Logger
): EnhancedCaseData => {
  const caseUrl =
    getCaseUrl(request, coreServices.coreStart, coreServices.spaceId, caseItem.id, caseItem.owner) ||
    null;
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
 * Deduplicates cases across multiple arrays by case ID.
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

const APP_ROUTES = {
  security: '/app/security',
  observability: '/app/observability',
  management: '/app/management/insightsAndAlerting',
} as const;

function getAppRoute(owner: string): string {
  const ownerToRoute: Record<string, string> = {
    securitySolution: APP_ROUTES.security,
    observability: APP_ROUTES.observability,
    cases: APP_ROUTES.management,
  };
  return ownerToRoute[owner] || APP_ROUTES.management;
}

function buildFullUrl(
  request: KibanaRequest,
  core: CoreStart,
  spaceId: string,
  path: string
): string {
  const publicBaseUrl = core.http.basePath.publicBaseUrl;
  const serverBasePath = core.http.basePath.serverBasePath;

  if (publicBaseUrl) {
    const pathWithSpace = addSpaceIdToPath(serverBasePath, spaceId, path);
    return `${publicBaseUrl}${pathWithSpace}`;
  }

  const protocol = request.headers['x-forwarded-proto'] || 'http';
  const host = request.headers.host || 'localhost:5601';
  const baseUrl = `${protocol}://${host}`;
  const pathWithSpace = addSpaceIdToPath(serverBasePath, spaceId, path);

  return `${baseUrl}${pathWithSpace}`;
}

/**
 * Generate a URL to a case.
 * @param spaceId - from ToolHandlerContext.spaceId
 */
export function getCaseUrl(
  request: KibanaRequest,
  core: CoreStart,
  spaceId: string,
  caseId: string,
  owner: string
): string | null {
  try {
    const publicBaseUrl = core.http.basePath.publicBaseUrl;

    if (publicBaseUrl) {
      return getCaseViewPath({
        publicBaseUrl,
        spaceId,
        caseId,
        owner,
      });
    }

    const appRoute = getAppRoute(owner);
    const path = `${appRoute}/cases/${caseId}`;
    return buildFullUrl(request, core, spaceId, path);
  } catch (error) {
    return null;
  }
}
