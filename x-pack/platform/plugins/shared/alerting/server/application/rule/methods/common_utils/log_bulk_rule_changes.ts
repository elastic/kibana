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
  ruleSOs: Array<SavedObject<RawRule>>;
  action: string;
}

export async function logBulkRuleChanges({
  context: { changeTrackingService, ruleTypeRegistry, logger, spaceId },
  ruleSOs,
  action,
}: LogBulkRuleChanges): Promise<void> {
  if (!changeTrackingService) {
    return;
  }

  try {
    const changes: RuleChange[] = [];

    for (const ruleSO of ruleSOs) {
      if (ruleSO.error) {
        continue;
      }

      const ruleType = ruleTypeRegistry.get(ruleSO.attributes.alertTypeId);

      if (!ruleType.trackChanges) {
        continue;
      }

      changes.push({
        objectId: ruleSO.id,
        objectType: RULE_SAVED_OBJECT_TYPE,
        module: ruleType.solution,
        snapshot: {
          attributes: ruleSO.attributes,
          references: ruleSO.references ?? [],
        },
      });
    }

    if (!changes.length) {
      return;
    }

    await changeTrackingService.logBulk(changes, {
      action,
      spaceId: spaceId,
      data: { metadata: { bulkCount: ruleSOs.length } },
    });
  } catch (e) {
    logger.warn(`Unable to log bulk rule changes for action "${action}": ${e}`);
  }
}
