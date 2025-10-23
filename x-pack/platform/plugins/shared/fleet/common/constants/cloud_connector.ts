/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Backward compatibility for CSPM and Asset Discovery
export const AWS_ROLE_ARN_VAR_NAME = 'aws.role_arn';
export const AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME = 'aws.credentials.external_id';

export const ROLE_ARN_VAR_NAME = 'role_arn';
export const EXTERNAL_ID_VAR_NAME = 'external_id';
export const SUPPORTED_CLOUD_CONNECTOR_VARS = [
  AWS_ROLE_ARN_VAR_NAME,
  AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME,
  ROLE_ARN_VAR_NAME,
  EXTERNAL_ID_VAR_NAME,
];
