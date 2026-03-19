/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import { COMPLIANCE_RULE_SO_TYPE } from '../../../common/compliance';
import type { ComplianceRuleMetadata, CompliancePlatform } from '../../../common/compliance';

export const runComplianceCheck = async (
  soClient: SavedObjectsClientContract,
  hostPlatform: CompliancePlatform,
  logger: Logger
): Promise<{ queries: Array<{ id: string; query: string; rule_name: string }> }> => {
  const rules = await soClient.find<ComplianceRuleMetadata>({
    type: COMPLIANCE_RULE_SO_TYPE,
    filter: `${COMPLIANCE_RULE_SO_TYPE}.attributes.platform: "${hostPlatform}" AND ${COMPLIANCE_RULE_SO_TYPE}.attributes.enabled: true`,
    perPage: 200,
  });

  const queries = rules.saved_objects.map((so) => ({
    id: so.attributes.rule_id,
    query: so.attributes.query,
    rule_name: so.attributes.name,
  }));

  logger.info(`Prepared ${queries.length} compliance queries for ${hostPlatform} host`);

  return { queries };
};
