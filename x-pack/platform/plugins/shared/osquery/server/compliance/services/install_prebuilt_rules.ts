/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import { COMPLIANCE_RULE_SO_TYPE } from '../../../common/compliance';
import { PREBUILT_COMPLIANCE_RULES } from '../../../common/compliance/prebuilt_rules';

export const installPrebuiltRules = async (
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<{ installed: number; skipped: number }> => {
  const objects = PREBUILT_COMPLIANCE_RULES.map((rule) => ({
    type: COMPLIANCE_RULE_SO_TYPE,
    id: rule.rule_id,
    attributes: rule,
  }));

  try {
    const result = await soClient.bulkCreate(objects, { overwrite: false });
    const installed = result.saved_objects.filter((so) => !so.error).length;
    const skipped = result.saved_objects.filter((so) => so.error).length;
    logger.info(
      `Prebuilt compliance rules: ${installed} installed, ${skipped} skipped (already exist)`
    );

    return { installed, skipped };
  } catch (error) {
    logger.error(`Failed to install prebuilt rules: ${error.message}`);

    return { installed: 0, skipped: 0 };
  }
};
