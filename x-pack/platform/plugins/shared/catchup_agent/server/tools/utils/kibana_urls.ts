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
import { getSpaceId } from '../../services/service_locator';

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
 * Helper function to build URLs with consistent error handling
 */
function buildUrl(
  request: KibanaRequest,
  core: CoreStart,
  pathBuilder: (spaceId: string) => string,
  onError?: () => string | null
): string | null {
  try {
    const spaceId = getSpaceId(request);
    const path = pathBuilder(spaceId);
    return buildFullUrl(request, core, spaceId, path);
  } catch (error) {
    return onError?.() ?? null;
  }
}

/**
 * Generate a URL to a security case
 */
export function getCaseUrl(
  request: KibanaRequest,
  core: CoreStart,
  caseId: string,
  owner: string
): string | null {
  try {
    const spaceId = getSpaceId(request);
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

/**
 * Generate a URL to an attack discovery
 */
export function getAttackDiscoveryUrl(
  request: KibanaRequest,
  core: CoreStart,
  attackDiscoveryId: string
): string | null {
  return buildUrl(request, core, () => {
    return `${APP_ROUTES.security}/attack_discovery?id=${encodeURIComponent(attackDiscoveryId)}`;
  });
}

/**
 * Generate a URL to a security alert/detection
 */
export function getAlertUrl(
  request: KibanaRequest,
  core: CoreStart,
  alertId: string,
  index: string,
  timestamp: string
): string | null {
  return buildUrl(request, core, () => {
    return `${APP_ROUTES.security}/alerts/redirect/${encodeURIComponent(
      alertId
    )}?index=${encodeURIComponent(index)}&timestamp=${encodeURIComponent(timestamp)}`;
  });
}

/**
 * Generate a URL to a detection rule
 */
export function getRuleUrl(request: KibanaRequest, core: CoreStart, ruleId: string): string | null {
  return buildUrl(request, core, () => {
    return `${APP_ROUTES.security}/rules/id/${encodeURIComponent(ruleId)}`;
  });
}

/**
 * Generate a URL to the alerts page with time range filter
 * @param start - ISO datetime string for start time
 * @param end - ISO datetime string for end time (optional, defaults to now)
 */
export function getAlertsPageUrl(
  request: KibanaRequest,
  core: CoreStart,
  start: string,
  end?: string | null
): string | null {
  return buildUrl(request, core, () => {
    // Use RISON encoding for timerange parameter
    // Format matches: (global:(linkTo:!(),timerange:(from:'ISO_DATE',kind:absolute,to:'ISO_DATE')),timeline:(linkTo:!(),timerange:(from:'ISO_DATE',kind:absolute,to:'ISO_DATE')))
    const endTime = end || new Date().toISOString();
    // RISON format with both global and timeline sections
    // Note: Single quotes in RISON are escaped as %27 in URL encoding
    const timerange = `(global:(linkTo:!(),timerange:(from:'${start}',kind:absolute,to:'${endTime}')),timeline:(linkTo:!(),timerange:(from:'${start}',kind:absolute,to:'${endTime}')))`;
    // URL encode the RISON string for use as a query parameter
    return `${APP_ROUTES.security}/alerts?timerange=${encodeURIComponent(timerange)}`;
  });
}
