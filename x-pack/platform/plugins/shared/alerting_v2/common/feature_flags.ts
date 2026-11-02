/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Selects the ES|QL transport the rule executor uses to fetch query results.
 *
 * The value must be a format name registered in the ES|QL response format
 * registry (`server/lib/services/query_service/formats`); anything else falls
 * back to the default format. Which transport the framework uses is an
 * implementation detail rather than an operator concern, so it is a feature
 * flag we roll out and roll back, not a `kibana.yml` setting.
 *
 * Variations are managed by the feature flag provider, not in this repo. A
 * deployment with no provider attached resolves the default format.
 */
export const ESQL_RESPONSE_FORMAT_FEATURE_FLAG = 'alertingV2.esqlResponseFormat';
