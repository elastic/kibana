/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import { COMPLIANCE_RULE_SO_TYPE } from '../../../common/compliance';
import type { ComplianceRuleMetadata } from '../../../common/compliance';
import { PREBUILT_COMPLIANCE_RULES } from '../../../common/compliance/prebuilt_rules';

export const installPrebuiltRules = async (
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<{ installed: number; skipped: number }> => {
  let installed = 0;
  let skipped = 0;

  for (const rule of PREBUILT_COMPLIANCE_RULES) {
    try {
      const existing = await soClient
        .find({
          type: COMPLIANCE_RULE_SO_TYPE,
          filter: `${COMPLIANCE_RULE_SO_TYPE}.attributes.rule_id: "${rule.rule_id}"`,
          perPage: 1,
        })
        .catch(() => ({ total: 0 }));

      if (existing.total > 0) {
        skipped++;
        continue;
      }

      await soClient.create<ComplianceRuleMetadata>(COMPLIANCE_RULE_SO_TYPE, rule, {
        id: rule.rule_id,
      });
      installed++;
    } catch (error) {
      logger.warn(`Failed to install prebuilt rule ${rule.rule_id}: ${error.message}`);
    }
  }

  logger.info(
    `Prebuilt compliance rules: ${installed} installed, ${skipped} skipped (already exist)`
  );

  return { installed, skipped };
};
