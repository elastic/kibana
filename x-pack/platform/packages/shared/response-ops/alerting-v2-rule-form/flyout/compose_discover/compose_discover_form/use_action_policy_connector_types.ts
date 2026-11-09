/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { useService } from '@kbn/core-di-browser';
import { useQuery } from '@kbn/react-query';
import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowApi } from '@kbn/workflows-ui';
import { useMemo } from 'react';
import { unionWorkflowConnectorTypes } from './get_workflow_connector_types';

const QUERY_KEY_PREFIX = 'alertingV2RuleForm';

/** Only the `definition` field is needed to derive connector types. */
const MGET_SOURCE = ['definition'];

export interface UseActionPolicyConnectorTypesResult {
  /** Connector types per action policy id. Absent id means "no workflow destinations". */
  connectorTypesByPolicy: Map<string, string[]>;
  isLoading: boolean;
}

const getWorkflowDestinationIds = (policy: ActionPolicyResponse): string[] =>
  policy.destinations
    .filter(
      (destination): destination is Extract<typeof destination, { type: 'workflow' }> =>
        destination.type === 'workflow'
    )
    .map((destination) => destination.id)
    .filter((id) => id.length > 0);

/**
 * Resolves the union of workflow connector types for each action policy using a
 * single batched `mgetWorkflows` request (deduplicated ids, `definition`-only
 * source) so a rule matching many policies does not fan out one fetch per
 * workflow destination.
 */
export const useActionPolicyConnectorTypes = (
  policies: readonly ActionPolicyResponse[] | undefined
): UseActionPolicyConnectorTypesResult => {
  const workflowsApi = useService(WorkflowApi);

  const workflowIds = useMemo(() => {
    const ids = (policies ?? []).flatMap(getWorkflowDestinationIds);
    return [...new Set(ids)].sort();
  }, [policies]);

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEY_PREFIX, 'workflowDefinitions', workflowIds] as const,
    queryFn: () => workflowsApi.mgetWorkflows({ ids: workflowIds, source: MGET_SOURCE }),
    enabled: workflowIds.length > 0,
    refetchOnWindowFocus: false,
  });

  const connectorTypesByPolicy = useMemo(() => {
    const definitionsById = new Map<string, WorkflowYaml | null | undefined>(
      (data ?? []).map((workflow) => [workflow.id, workflow.definition])
    );

    const byPolicy = new Map<string, string[]>();
    for (const policy of policies ?? []) {
      const definitions = getWorkflowDestinationIds(policy).map((id) => definitionsById.get(id));
      byPolicy.set(policy.id, unionWorkflowConnectorTypes(definitions));
    }
    return byPolicy;
  }, [policies, data]);

  return {
    connectorTypesByPolicy,
    isLoading: workflowIds.length > 0 && isLoading,
  };
};
