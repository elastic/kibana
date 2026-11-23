/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecretMetadata } from '@kbn/secrets';

export const WORKFLOW_SECRETS_ROUTE = '/internal/workflows/secrets';
export const WORKFLOW_SECRET_ROUTE = `${WORKFLOW_SECRETS_ROUTE}/{name}`;

export interface WorkflowSecretsListResponse {
  /** The secrets of the space that Workflows may use, without their values. */
  secrets: SecretMetadata[];
}
