/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SIGNIFICANT_EVENT_TYPE_OPERATIONAL = 'operational' as const;
export const SIGNIFICANT_EVENT_TYPE_CONFIGURATION = 'configuration' as const;
export const SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH = 'resource_health' as const;
export const SIGNIFICANT_EVENT_TYPE_ERROR = 'error' as const;
export const SIGNIFICANT_EVENT_TYPE_SECURITY = 'security' as const;

export type SignificantEventType =
  | typeof SIGNIFICANT_EVENT_TYPE_OPERATIONAL
  | typeof SIGNIFICANT_EVENT_TYPE_CONFIGURATION
  | typeof SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH
  | typeof SIGNIFICANT_EVENT_TYPE_ERROR
  | typeof SIGNIFICANT_EVENT_TYPE_SECURITY;
