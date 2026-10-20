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
import type { RawRule } from '../../../types';
import { findAndTransformLegacyActions } from './find_and_transform_legacy_actions';

interface BulkMigrateLegacyActionsParams {
  context: RulesClientContext;
  rules: Array<SavedObject<RawRule>>;
  skipActionsValidation?: boolean;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * migrates SIEM legacy actions and merges rule actions and references.
 * Migrated legacy objects are NOT deleted here: once the returned rules are saved, the caller must call
 * `deleteLegacyActionsForRules` with the ids of the rules that saved successfully. Deleting earlier loses the
 * actions when the save fails, for example on a version conflict.
 * A rule that already has actions keeps them: its legacy objects are discarded without being merged.
 * @param context RulesClient context
 * @param rules Rules to check for legacy actions
 * @param skipActionsValidation Skip validating actions after transformation
 * @returns IDs of rules that had actions migrated, to be cleaned up after they are saved
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

    const transformed = await findAndTransformLegacyActions(
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
      // Only rules without actions get here (see findAndTransformLegacyActions), so there is nothing to merge
      rule.attributes.actions = transformedActions;
      rule.references = [...rule.references, ...transformedReferences];
      // Only clear rule-level throttle when there are actual migrated actions from
      // the sidecar (throttled sidecars). For no_actions/rule sidecars (empty
      // transformedActions), the original throttle value should be preserved since
      // there are no per-action frequencies being migrated from the sidecar.
      if (transformedActions.length > 0) {
        rule.attributes.throttle = undefined;
      }
      rule.attributes.notifyWhen = null;
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
