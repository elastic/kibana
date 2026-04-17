/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const UIAM_LOGS_COMMON_TAGS = ['serverless', 'alerting', 'uiam'];

export const UIAM_LOGS_GRANT_TAGS = [...UIAM_LOGS_COMMON_TAGS, 'uiam-api-key-grant'];
export const UIAM_LOGS_INVALIDATE_TAGS = [...UIAM_LOGS_COMMON_TAGS, 'uiam-api-key-invalidate'];
export const UIAM_LOGS_CREDENTIALS_TAGS = [
  ...UIAM_LOGS_COMMON_TAGS,
  'uiam-api-key-invalid-credentials',
];
export const UIAM_LOGS_USAGE_TAGS = [...UIAM_LOGS_COMMON_TAGS, 'uiam-api-key-missing'];
