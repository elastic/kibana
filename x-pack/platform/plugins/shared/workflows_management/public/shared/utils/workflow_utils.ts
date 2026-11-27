/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsSearchParams } from '@kbn/workflows';

export interface WorkflowsData {
  total: number;
}

export function shouldShowWorkflowsEmptyState(
  workflows: WorkflowsData | undefined,
  search: WorkflowsSearchParams
): boolean {
  const hasNoWorkflows = workflows?.total === 0;
  const hasNoFilters =
    !search.query &&
    (!search.enabled || search.enabled.length === 0) &&
    (!search.createdBy || search.createdBy.length === 0) &&
    (!search.tags || search.tags.length === 0) &&
    (!search.managed || search.managed === 'unmanaged');

  return hasNoWorkflows && hasNoFilters;
}
