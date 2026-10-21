/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { WorkflowYaml } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { useMemo } from 'react';

export interface WorkflowSummary {
  id: string;
  name?: string;
  enabled?: boolean;
  definition?: WorkflowYaml | null;
}

const is403 = (error: unknown): boolean => {
  if (error instanceof Error && 'response' in error) {
    return (error as Error & { response?: Response }).response?.status === 403;
  }
  return false;
};

/**
 * Fetches workflow summary data.
 *
 * When `missingReadPrivilege` is true when the server returned 403 — the caller
 * should surface a clear "missing permissions" message.
 */
export const useWorkflowSummaries = (workflowIds: string[]) => {
  const api = useWorkflowsApi();
  const ids = useMemo(() => [...new Set(workflowIds)].sort(), [workflowIds]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['context_engine', 'workflow_summaries', ids],
    queryFn: () => api.mgetWorkflows({ ids, source: ['id', 'name', 'enabled', 'definition'] }),
    enabled: ids.length > 0,
    // Editing the automations changes the query key, which would otherwise drop the resolved summaries.
    keepPreviousData: true,
    // Do not retry 403s — they are not transient.
    retry: (failureCount, err) => !is403(err) && failureCount < 3,
  });

  const missingReadPrivilege = is403(error);

  const summaries = useMemo(() => {
    const byId = new Map<string, WorkflowSummary>();
    for (const workflow of data ?? []) {
      byId.set(workflow.id, {
        id: workflow.id,
        name: workflow.name,
        enabled: workflow.enabled,
        definition: workflow.definition,
      });
    }
    return byId;
  }, [data]);

  return { summaries, isLoading: ids.length > 0 && isLoading, missingReadPrivilege };
};
