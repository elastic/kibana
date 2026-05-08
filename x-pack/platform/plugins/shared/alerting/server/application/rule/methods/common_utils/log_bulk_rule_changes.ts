/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObject } from '@kbn/core/server';
import type { RuleChange } from '../../../../rules_client/lib/change_tracking';
import type { RawRule, RuleTypeRegistry } from '../../../../types';
import type { RulesClientContext } from '../../../../rules_client/types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

interface LogBulkRuleChanges {
  /**
   * Rule saved objects after applying the changes
   */
  ruleSOs: Array<SavedObject<RawRule>>;
  /**
   * Context information describing the changes
   */
  rulesClientContext: RulesClientContext;
  changesContext: {
    /**
     * Action performed on rule, e.g. rule_create or rule_update
     */
    action: string;
    /**
     * Original timestamp of the change
     */
    timestamp: string | number | Date;
    /**
     * Change metadata object to be written to the each change history item
     */
    metadata?: {
      /**
       * Original number of rules affected by the bulk action.
       *
       * Driving code should provide this number for bulk actions.
       * Due to OCC we can't capture this number deeper in the call stack.
       *
       * Default: ruleSOs.length when not provided
       */ bulkCount?: number;
    } & Record<string, number | boolean | string>;
  };
}

export async function logBulkRuleChanges({
  ruleSOs,
  rulesClientContext: { changeTrackingService, ruleTypeRegistry, logger, spaceId },
  changesContext: { action, timestamp, metadata: extraMetadata },
}: LogBulkRuleChanges): Promise<void> {
  if (!changeTrackingService) {
    return;
  }

  const changes: RuleChange[] = [];

  for (const ruleSO of ruleSOs) {
    if (ruleSO.error) {
      continue;
    }

    const ruleType = getRuleType(ruleTypeRegistry, ruleSO.attributes.alertTypeId, logger);

    if (!ruleType?.trackChanges) {
      continue;
    }

    changes.push({
      timestamp: new Date(timestamp).toISOString(),
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

  try {
    const metadata = { ...extraMetadata, bulkCount: extraMetadata?.bulkCount ?? ruleSOs.length };
    const hasMetadata = Boolean(Object.keys(metadata).length);

    await changeTrackingService.logBulk(changes, {
      action,
      spaceId,
      ...(hasMetadata ? { data: { metadata } } : {}),
    });
  } catch (e) {
    logger.warn(`Unable to log bulk rule changes for action "${action}": ${e}`);
  }
}

function getRuleType(
  ruleTypeRegistry: RuleTypeRegistry,
  alertTypeId: string,
  logger: Logger
): ReturnType<RuleTypeRegistry['get']> | undefined {
  if (!alertTypeId) {
    return;
  }

  try {
    return ruleTypeRegistry.get(alertTypeId);
  } catch (e) {
    logger.debug(`Unable to fetch "${alertTypeId}" rule type from RuleTypeRegistry: ${e}`);
  }
}
