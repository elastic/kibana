/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError, yieldToEventLoop } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { extractAgentIdsWithData } from '../../../common/services/agent_utils';
import { buildPolicyBaseIdsWithFallbackKuery } from '../../../common/services/version_specific_policies_utils';
import { awsOnboardingHasDataCommonDefinition } from '../../../common/workflows/steps/has_data';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

interface EnrolledAgent {
  id: string;
  policy_id?: string;
  policy_base_id?: string;
  status?: string;
}

const networkError = (action: string, error: unknown) =>
  new ExecutionError({
    type: 'NetworkError',
    message: `Failed while ${action}: ${error instanceof Error ? error.message : String(error)}`,
  });

export const awsOnboardingHasDataStepDefinition = createServerStepDefinition({
  ...awsOnboardingHasDataCommonDefinition,
  handler: async (context) => {
    if (!(await isAgenticAwsOnboardingEnabled())) {
      return {
        error: new ExecutionError({
          type: 'PermissionError',
          message: 'Agentic AWS onboarding is not enabled',
        }),
      };
    }

    const {
      policy_ids: policyIds,
      package_name: pkgName,
      package_version: pkgVersion,
    } = context.input;

    // Agentless agents are hidden from the agents list unless `showAgentless` is set.
    let enrolled: EnrolledAgent[];
    try {
      const agentsResponse = await context.contextManager.callKibanaApi<{
        items: EnrolledAgent[];
      }>({
        method: 'GET',
        path: '/api/fleet/agents',
        query: {
          kuery: buildPolicyBaseIdsWithFallbackKuery(
            policyIds,
            'fleet-agents.policy_base_id',
            'fleet-agents.policy_id'
          ),
          perPage: 1000,
          showAgentless: true,
        },
      });
      enrolled = agentsResponse.body.items;
    } catch (error) {
      return { error: networkError('listing the enrolled agents', error) };
    }

    // Data is checked per agent, never per index pattern: an account that already has aws data
    // must not report success before the newly enrolled agent reports.
    let idsWithData = new Set<string>();
    if (enrolled.length > 0) {
      try {
        const dataResponse = await context.contextManager.callKibanaApi<{
          items: Array<Record<string, { data: boolean }>>;
        }>({
          method: 'GET',
          path: '/api/fleet/agent_status/data',
          query: { agentsIds: enrolled.map(({ id }) => id).join(','), pkgName, pkgVersion },
        });
        idsWithData = new Set(extractAgentIdsWithData(dataResponse.body.items));
      } catch (error) {
        return { error: networkError('checking agent data', error) };
      }
    }

    const agents: Array<{
      policy_id: string;
      agent_id?: string;
      agent_policy_id?: string;
      status?: string;
      data: boolean;
    }> = [];
    for (const policyId of policyIds) {
      await yieldToEventLoop();
      if (context.abortSignal.aborted) {
        break;
      }
      const policyAgents = enrolled.filter(
        (agent) => (agent.policy_base_id ?? agent.policy_id) === policyId
      );
      if (policyAgents.length === 0) {
        agents.push({ policy_id: policyId, data: false });
      }
      for (const agent of policyAgents) {
        agents.push({
          policy_id: policyId,
          agent_id: agent.id,
          agent_policy_id: agent.policy_id,
          status: agent.status,
          data: idsWithData.has(agent.id),
        });
      }
    }

    // Every requested policy must have at least one agent that reported data.
    const policiesWithData = policyIds.filter((policyId) =>
      agents.some((agent) => agent.policy_id === policyId && agent.data)
    );
    const policiesWithoutData = policyIds.filter(
      (policyId) => !policiesWithData.includes(policyId)
    );

    return {
      output: {
        has_data: policiesWithoutData.length === 0,
        policies_with_data: policiesWithData,
        policies_without_data: policiesWithoutData,
        agents,
      },
    };
  },
});
