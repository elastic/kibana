/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wraps the provided Kibana route URL with the Kibana space ID.
 * "default" space is equivalent to an empty value and doesn't lead to adding any space aware path.
 *
 * @param routeUrl the route url string
 * @param spaceId [optional] the Kibana space to account for in the route url
 *
 * Examples:
 * - `getRouteUrlForSpace('/api/some_endpoint')` returns `/api/some_endpoint`
 * - `getRouteUrlForSpace('/api/some_endpoint', 'default')` returns `/api/some_endpoint`
 * - `getRouteUrlForSpace('/api/some_endpoint', 'my_space') returns `/s/my_space/api/some_endpoint`
 */
export function getRouteUrlForSpace(routeUrl: string, spaceId?: string): string {
  return spaceId ? `/s/${spaceId}${routeUrl}` : routeUrl;
}
