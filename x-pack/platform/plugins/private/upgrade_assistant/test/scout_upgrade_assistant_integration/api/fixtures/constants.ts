/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

export const UPGRADE_ASSISTANT_INTEGRATION_TAGS = tags.stateful.classic;
export const UPGRADE_ASSISTANT_SKIP_ISSUE = 'https://github.com/elastic/kibana/issues/266002';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const USAGE_COUNTERS_SAVED_OBJECT_INDEX = '.kibana_usage_counters';

export const ROUTES = {
  deprecations: 'api/deprecations/',
  markAsResolved: 'api/deprecations/mark_as_resolved?elasticInternalOrigin=true',
  upgradeAssistantStatus: 'api/upgrade_assistant/status',
  removedRoute: 'api/routing_example/d/removed_route',
  removedRouteWithInternalOrigin: 'api/routing_example/d/removed_route?elasticInternalOrigin=true',
  versionedRoute: 'api/routing_example/d/versioned_route?apiVersion=2023-10-31',
  internalVersionedRoute: 'internal/routing_example/d/internal_versioned_route?apiVersion=1',
} as const;

export const REMOVED_ROUTE_API_ID = 'unversioned|get|/api/routing_example/d/removed_route';
export const INTERNAL_VERSIONED_ROUTE_API_ID =
  '1|get|/internal/routing_example/d/internal_versioned_route';
export const VERSIONED_ROUTE_COUNTER_NAME = '2023-10-31|get|/api/routing_example/d/versioned_route';
export const API_DEPRECATIONS_DOMAIN_ID = 'core.api_deprecations';
