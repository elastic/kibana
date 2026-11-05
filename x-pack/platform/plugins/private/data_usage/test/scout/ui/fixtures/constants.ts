/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Custom roles are not available on MKI. No logs_essentials: the UI specs run where the FTR functional configs ran
export const LOCAL_SERVERLESS_UI_TAGS = [
  '@local-serverless-security_complete',
  '@local-serverless-observability_complete',
  '@local-serverless-search',
];
