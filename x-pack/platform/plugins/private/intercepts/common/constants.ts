/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * API route for intercept
 */

export const TRIGGER_INFO_API_ROUTE = '/internal/api/intercepts/trigger_info' as const;

export const TRIGGER_USER_INTERACTION_METADATA_API_ROUTE =
  '/internal/api/intercepts/user_interaction/{triggerId}' as const;

/**
 * Telemetry
 */

export const API_USAGE_COUNTER_TYPE = 'interceptApi' as const;

export const API_USAGE_ERROR_TYPE = 'interceptApiError' as const;

export const USAGE_COLLECTION_DOMAIN_ID = 'intercepts' as const;
