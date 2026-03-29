/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const EXECUTION_IDENTITY_SO_TYPE = 'execution-identity';

export const PLUGIN_ID = 'executionIdentity';
export const PLUGIN_NAME = 'Execution Identity';

export interface ExecutionIdentity {
  id: string;
  name: string;
  description: string;
  role_descriptors: Record<string, unknown>;
  api_key_id: string;
  created_by: string;
  created_at: string;
}

export interface CreateExecutionIdentityRequest {
  name: string;
  description: string;
  role_descriptors: Record<string, unknown>;
}
