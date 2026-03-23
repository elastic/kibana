/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { AlertConsumers } from '@kbn/rule-data-utils';
import type { SavedObject } from '@kbn/core/server';
import type { RulesClientContext } from '../..';
import type { RawRuleAction, RawRule } from '../../../types';
import { transformAndDeleteLegacyActions } from './transform_and_delete_legacy_actions';

interface BulkMigrateLegacyActionsParams {
  context: RulesClientContext;
  rules: Array<SavedObject<RawRule>>;
  skipActionsValidation?: boolean;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * migrates SIEM legacy actions and merges rule actions and references
 * @param context RulesClient context
 * @param rules Rules to check for legacy actions
 * @param skipActionsValidation Skip validating actions after transformation
 * @returns IDs of rules that had actions migrated
 */
export const bulkMigrateLegacyActions = async ({
  context,
  rules,
  skipActionsValidation = false,
}: BulkMigrateLegacyActionsParams): Promise<string[]> => {
  try {
    const siemRules = rules.filter((rule) => rule.attributes.consumer === AlertConsumers.SIEM);
    const siemRulesMap: Map<string, SavedObject<RawRule>> = new Map();
    siemRules.forEach((rule) => siemRulesMap.set(rule.id, rule));

    const transformed = await transformAndDeleteLegacyActions(
      context,
      siemRules,
      skipActionsValidation
    );

    Object.keys(transformed).forEach((ruleId) => {
      const rule = siemRulesMap.get(ruleId);
      if (rule == null) {
        context.logger.debug(
          `bulkMigrateLegacyActions(): Failed to find SIEM rule by ID in map: ${ruleId}`
        );
        return;
      }
      const { transformedActions, transformedReferences } = transformed[ruleId];
      // fix references for a case when non-legacy actions present in a rule before the migration
      const actions = rule.attributes.actions;
      if (actions.length) {
        transformedActions.forEach((transformedAction, i) => {
          const oldReferenceName = transformedAction.actionRef;
          const transformedReference = transformedReferences.find(
            ({ name }) => name === oldReferenceName
          );
          const newReferenceName = `action_${actions.length + i}`;
          transformedAction.actionRef = newReferenceName;

          if (transformedReference) {
            transformedReference.name = newReferenceName;
          }
        });
      }

      // put frequencies into existing actions
      // the situation when both action in rule and legacy exist should be rare one
      // but if it happens, we put frequency in existing actions per-action level
      const existingActionsWithFrequencies: RawRuleAction[] = actions.map((action) => ({
        ...action,
        frequency: {
          summary: true,
          notifyWhen: rule.attributes.notifyWhen ?? 'onActiveAlert',
          throttle: rule.attributes.throttle ?? null,
        },
      }));

      rule.attributes.actions = [...existingActionsWithFrequencies, ...transformedActions];
      rule.references = [...rule.references, ...transformedReferences];
      rule.attributes.throttle = undefined;
      rule.attributes.notifyWhen = undefined;
    });
    return Object.keys(transformed);
  } catch (e) {
    context.logger.error(
      `bulkMigrateLegacyActions(): Failed to bulk migrate legacy actions for SIEM rules: ${e.message}`
    );
    throw Boom.badRequest(
      i18n.translate('xpack.alerting.rulesClient.validateLegacyActions.bulkMigrationError', {
        defaultMessage: 'Failed to bulk migrate legacy actions for SIEM rules: {errorMessage}',
        values: {
          errorMessage: e.message,
        },
      })
    );
  }
};
