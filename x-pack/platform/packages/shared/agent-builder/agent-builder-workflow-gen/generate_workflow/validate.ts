/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { ValidationResult } from './types';

interface Deps {
  api: WorkflowsManagementApi;
  spaceId: string;
  request: KibanaRequest;
}

export const validateGeneratedYaml = async (
  yaml: string,
  { api, spaceId, request }: Deps
): Promise<ValidationResult> => {
  const result = await api.validateWorkflow(yaml, spaceId, request);

  if (result.valid && result.parsedWorkflow) {
    return { valid: true, parsedWorkflow: result.parsedWorkflow, errors: [] };
  }

  const errors = (result.diagnostics ?? [])
    .filter((d) => d.severity === 'error')
    .map((d) => `[${d.source}] ${d.message}${d.path ? ` (at ${d.path.join('.')})` : ''}`);

  return { valid: false, errors };
};
