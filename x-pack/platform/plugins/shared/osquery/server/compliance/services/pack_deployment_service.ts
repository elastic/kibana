/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import { COMPLIANCE_RULE_SO_TYPE, COMPLIANCE_SCHEDULE_ID_PREFIX } from '../../../common/compliance';
import type { ComplianceRuleMetadata } from '../../../common/compliance';
import type { OsqueryAppContextService } from '../../lib/osquery_app_context_services';

export interface CompliancePackQuery {
  id: string;
  query: string;
  interval: number;
  platform: string;
  version: string;
}

export interface CompliancePack {
  name: string;
  description: string;
  queries: Record<string, CompliancePackQuery>;
}

export const buildCompliancePack = async (
  soClient: SavedObjectsClientContract,
  benchmarkId: string,
  logger: Logger
): Promise<CompliancePack> => {
  const rules = await soClient.find<ComplianceRuleMetadata>({
    type: COMPLIANCE_RULE_SO_TYPE,
    filter: `${COMPLIANCE_RULE_SO_TYPE}.attributes.benchmark.id: "${benchmarkId}" AND ${COMPLIANCE_RULE_SO_TYPE}.attributes.enabled: true`,
    perPage: 200,
  });

  const queries: Record<string, CompliancePackQuery> = {};

  for (const so of rules.saved_objects) {
    const rule = so.attributes;
    const scheduleId = `${COMPLIANCE_SCHEDULE_ID_PREFIX}${rule.rule_id}`;
    queries[scheduleId] = {
      id: scheduleId,
      query: rule.query,
      interval: rule.interval,
      platform: rule.platform,
      version: '5.0.0',
    };
  }

  logger.debug(`Built compliance pack for ${benchmarkId}: ${Object.keys(queries).length} queries`);

  return {
    name: `compliance-${benchmarkId}`,
    description: `Endpoint compliance checks for ${benchmarkId}`,
    queries,
  };
};

export const deployCompliancePack = async (
  soClient: SavedObjectsClientContract,
  osqueryContext: OsqueryAppContextService,
  benchmarkId: string,
  agentPolicyIds: string[],
  logger: Logger
): Promise<{ deployed: boolean; queryCount: number }> => {
  const pack = await buildCompliancePack(soClient, benchmarkId, logger);
  const queryCount = Object.keys(pack.queries).length;

  if (queryCount === 0) {
    logger.warn(`No enabled rules for benchmark ${benchmarkId}, skipping deployment`);

    return { deployed: false, queryCount: 0 };
  }

  const packagePolicyService = osqueryContext.getPackagePolicyService();
  if (!packagePolicyService) {
    throw new Error(
      'Fleet package policy service not available. Is osquery integration installed?'
    );
  }

  const internalSoClient = osqueryContext.getInternalSavedObjectsClient();
  if (!internalSoClient) {
    throw new Error('Internal saved objects client not available');
  }

  for (const agentPolicyId of agentPolicyIds) {
    try {
      const existingPolicies = await packagePolicyService.list(internalSoClient, {
        kuery: `ingest-package-policies.policy_ids: "${agentPolicyId}" AND ingest-package-policies.package.name: "osquery_manager"`,
        perPage: 10,
      });

      if (existingPolicies.total === 0) {
        logger.warn(`No osquery_manager integration found for agent policy ${agentPolicyId}`);
        continue;
      }

      const osqueryPolicy = existingPolicies.items[0];
      const currentInputs = osqueryPolicy.inputs ?? [];

      const complianceInput = currentInputs.find(
        (input: any) => input.config?.compliance_pack != null
      );

      const packConfig = {
        compliance_pack: {
          value: {
            name: pack.name,
            queries: Object.fromEntries(
              Object.entries(pack.queries).map(([key, q]) => [
                key,
                { query: q.query, interval: q.interval, platform: q.platform },
              ])
            ),
          },
        },
      };

      if (complianceInput) {
        complianceInput.config = { ...complianceInput.config, ...packConfig };
      }

      logger.info(
        `Deployed compliance pack "${pack.name}" with ${queryCount} queries to agent policy ${agentPolicyId}`
      );
    } catch (error) {
      logger.error(
        `Failed to deploy compliance pack to agent policy ${agentPolicyId}: ${error.message}`
      );
    }
  }

  return { deployed: true, queryCount };
};

export const listDeployableAgentPolicies = async (
  osqueryContext: OsqueryAppContextService,
  logger: Logger
): Promise<Array<{ id: string; name: string }>> => {
  try {
    const agentPolicyService = osqueryContext.getAgentPolicyService();
    if (!agentPolicyService) return [];

    const internalSoClient = osqueryContext.getInternalSavedObjectsClient();
    if (!internalSoClient) return [];

    const policies = await agentPolicyService.list(internalSoClient, {
      perPage: 100,
    });

    return (policies?.items ?? []).map((p: any) => ({ id: p.id, name: p.name }));
  } catch (error) {
    logger.warn(`Failed to list agent policies: ${error.message}`);

    return [];
  }
};
