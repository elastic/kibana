/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Allowlist of the publicized integrations allowed in the Serverless Security SearchAILake tier (AI4DSOC effort).
 * This is used to control which integrations are displayed in the Configurations -> Integrations UI as well as
 * which promotion rules will be installed.
 */
export const SEARCH_AI_LAKE_PACKAGES = [
  'crowdstrike',
  'google_secops',
  'microsoft_sentinel',
  'sentinel_one',
  'splunk',
];

/**
 * Allowlist of integrations in addition to {@link SEARCH_AI_LAKE_PACKAGES} which are available to
 * install in the Serverless Security SearchAILake tier (AI4DSOC effort).
 */
export const SEARCH_AI_LAKE_ALLOWED_INSTALL_PACKAGES = [
  'elastic_agent',
  'elastic_connectors',
  'fleet_server',
  'security_ai_prompts',
  'security_detection_engine',
  'system',
];
