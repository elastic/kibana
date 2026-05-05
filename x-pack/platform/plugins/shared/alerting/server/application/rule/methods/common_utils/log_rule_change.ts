/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { RuleChange } from '../../../../rules_client/lib/change_tracking';
import type { RawRule } from '../../../../types';
import type { RulesClientContext } from '../../../../rules_client/types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

interface LogBulkRuleChanges {
  context: RulesClientContext;
  /**
   * Rule saved objects after applying the changes
   */
  ruleSO: SavedObject<RawRule>;
  action: string;
}

export async function logRuleChange({
  context: { changeTrackingService, ruleTypeRegistry, logger, spaceId },
  ruleSO,
  action,
}: LogBulkRuleChanges): Promise<void> {
  if (!changeTrackingService) {
    return;
  }

  try {
    const ruleType = ruleTypeRegistry.get(ruleSO.attributes.alertTypeId);

    if (!ruleType.trackChanges) {
      return;
    }

    const change: RuleChange = {
      objectId: ruleSO.id,
      objectType: RULE_SAVED_OBJECT_TYPE,
      module: ruleType.solution,
      snapshot: {
        attributes: ruleSO.attributes,
        references: ruleSO.references ?? [],
      },
    };

    await changeTrackingService.log(change, {
      action,
      spaceId: spaceId,
    });
  } catch (e) {
    logger.warn(`Unable to log rule change for action "${action}": ${e}`);
  }
}
