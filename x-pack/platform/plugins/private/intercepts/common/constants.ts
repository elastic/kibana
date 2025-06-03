/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TRIGGER_INFO_API_ROUTE = '/internal/product_intercept/trigger_info' as const;

export const TRIGGER_USER_INTERACTION_METADATA_API_ROUTE =
  '/internal/api/intercept/user_interaction/{triggerId}' as const;
