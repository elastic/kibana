/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreStart } from '@kbn/core/server';
import { getCaseViewPath } from '@kbn/cases-plugin/server/common/utils';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { getCurrentSpaceId } from './spaces';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

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

