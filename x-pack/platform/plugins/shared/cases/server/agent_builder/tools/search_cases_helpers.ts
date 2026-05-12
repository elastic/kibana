/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createErrorResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { CoreStart } from '@kbn/core/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Case, RelatedCase } from '../../../common/types/domain';
import { getCaseViewPath } from '../../common/utils';

export interface CoreServices {
  coreStart: CoreStart;
  /** Space ID for the current request, from ToolHandlerContext.spaceId */
  spaceId: string;
}

export interface EnhancedCaseData extends Case {
  url: string | null;
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
 * Enhances a case object with URL and markdown link fields.
 */
export const enhanceCaseData = (
  caseItem: Case,
  request: KibanaRequest,
  coreServices: CoreServices,
  logger: Logger
): EnhancedCaseData => {
  const caseUrl =
    getCaseUrl(
      request,
      coreServices.coreStart,
      coreServices.spaceId,
      caseItem.id,
      caseItem.owner
    ) || null;
  if (!caseUrl) {
    logger.warn(
      `[Cases Tool] Failed to generate URL for case ${caseItem.id} with owner ${caseItem.owner}`
    );
  }

  return {
    ...caseItem,
    url: caseUrl,
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
