/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { useMemo } from 'react';

export interface WorkflowSummary {
  id: string;
  name?: string;
  enabled?: boolean;
}

/**
 * Resolves display metadata (name, enabled state) for the workflows referenced
 * by an AI index's automations. Keyed by workflow id so rows can render a name
 * instead of the raw id.
 */
export const useWorkflowSummaries = (workflowIds: string[]) => {
  const api = useWorkflowsApi();
  const ids = useMemo(() => [...new Set(workflowIds)].sort(), [workflowIds]);

  const { data, isLoading } = useQuery({
    queryKey: ['context_engine', 'workflow_summaries', ids],
    queryFn: () => api.mgetWorkflows({ ids }),
    enabled: ids.length > 0,
    // Editing the automations changes the query key, which would otherwise drop the resolved summaries.
    keepPreviousData: true,
  });

  const summaries = useMemo(() => {
    const byId = new Map<string, WorkflowSummary>();
    for (const workflow of data ?? []) {
      byId.set(workflow.id, {
        id: workflow.id,
        name: workflow.name,
        enabled: workflow.enabled,
      });
    }
    return byId;
  }, [data]);

  return { summaries, isLoading: ids.length > 0 && isLoading };
};
