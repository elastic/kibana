/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RulesClientContext } from '../..';
import type { RawRule, RawRuleAction } from '../../../types';
import { findRules } from '../../../application/rule/methods/find/find_rules';
import { bulkDeleteRules } from '../../../application/rule/methods/bulk_delete';
import type { LegacyIRuleActionsAttributes } from './types';
import { legacyRuleActionsSavedObjectType } from './types';
import { transformFromLegacyActions } from './transform_legacy_actions';
import { validateActions } from '../validate_actions';
import { transformRawActionsToDomainActions } from '../../../application/rule/transforms/transform_raw_actions_to_domain_actions';

type FindAndTransformLegacyActions = (
  context: RulesClientContext,
  rules: Array<SavedObject<RawRule>>,
  skipActionsValidation: boolean
) => FindAndTransformLegacyActionsReturn;

type FindAndTransformLegacyActionsReturn = Promise<
  Record<
    string,
    {
      transformedActions: RawRuleAction[];
      transformedReferences: SavedObjectReference[];
    }
  >
>;

// ruleThrottle can have special values 'no_actions' or 'rule', or a duration like e.g. '1h'
// 'rule' means actions fire each time the rule runs, whereas a duration means the actions are
// throttled to only fire once per the specified time duration
const hasNoThrottledActions = ({ ruleThrottle }: LegacyIRuleActionsAttributes): boolean =>
  ruleThrottle === 'no_actions' || ruleThrottle === 'rule';

interface LegacyActionsLookup {
  siemNotificationRuleIds: string[];
  legacyRuleActionsSOs: Array<SavedObject<LegacyIRuleActionsAttributes>>;
}

const findLegacyActions = async (
  context: RulesClientContext,
  ruleIds: string[]
): Promise<LegacyActionsLookup> => {
  const hasReference = ruleIds.map((id) => ({ type: RULE_SAVED_OBJECT_TYPE, id }));
  const [siemNotifications, legacyRuleActionsSOs] = await Promise.all([
    findRules(context, {
      options: {
        filter: 'alert.attributes.alertTypeId:(siem.notifications)',
        hasReference,
      },
    }),
    context.unsecuredSavedObjectsClient.find<LegacyIRuleActionsAttributes>({
      type: legacyRuleActionsSavedObjectType,
      hasReference,
    }),
  ]);

  return {
    siemNotificationRuleIds: siemNotifications?.data.map((rule) => rule.id) ?? [],
    legacyRuleActionsSOs: legacyRuleActionsSOs?.saved_objects ?? [],
  };
};

const deleteLegacyActionObjects = async (
  context: RulesClientContext,
  { siemNotificationRuleIds, legacyRuleActionsSOs }: LegacyActionsLookup
) => {
  await Promise.all([
    // If the legacy notification rule type ("siem.notification") exist,
    // migration and cleanup are needed
    siemNotificationRuleIds.length > 0 &&
      bulkDeleteRules(context, { ids: siemNotificationRuleIds }),
    // Delete the legacy sidecar SO if it exists
    legacyRuleActionsSOs.length > 0 &&
      context.unsecuredSavedObjectsClient.bulkDelete(
        legacyRuleActionsSOs.map(({ id }) => ({ type: legacyRuleActionsSavedObjectType, id }))
      ),
  ]);
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * Deletes the legacy sidecar SOs and `siem.notification` rules that reference the given rules.
 * Call it only after the rules carrying the migrated actions have been saved. Failures are logged and
 * swallowed: a leftover sidecar is harmless because a rule that already has actions takes precedence over it.
 */
export const deleteLegacyActionsForRules = async (
  context: RulesClientContext,
  ruleIds: string[]
): Promise<void> => {
  if (ruleIds.length === 0) {
    return;
  }
  try {
    await deleteLegacyActionObjects(context, await findLegacyActions(context, ruleIds));
  } catch (e) {
    context.logger.warn(`Failed to delete legacy actions for SIEM rules: ${e.message}`);
  }
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * Retrieves legacy actions for SIEM rules and transforms them. Nothing is deleted for rules that still
 * need their actions persisted: the caller must call `deleteLegacyActionsForRules` after saving them.
 * A rule that already has actions is the source of truth, so its legacy objects are discarded right away.
 * @param context RulesClient context
 * @param rules rules to migrate
 * @returns transformed actions by rule id, only for rules that need to be saved with the migrated actions
 */
export const findAndTransformLegacyActions: FindAndTransformLegacyActions = async (
  context,
  rules,
  skipActionsValidation
) => {
  try {
    if (rules.length === 0) {
      return {};
    }

    const { siemNotificationRuleIds, legacyRuleActionsSOs } = await findLegacyActions(
      context,
      rules.map(({ id }) => id)
    );

    // Assumption: if no legacy sidecar SO or notification rule types exist
    // that reference the rule in question, assume rule actions are not legacy
    if (siemNotificationRuleIds.length === 0 && legacyRuleActionsSOs.length === 0) {
      return {};
    }

    const ruleIdsWithActions = new Set(
      rules.filter((rule) => rule.attributes.actions?.length > 0).map(({ id }) => id)
    );
    const getRuleId = (savedObject: SavedObject): string | undefined =>
      savedObject.references.find(({ type }) => type === RULE_SAVED_OBJECT_TYPE)?.id;

    // A rule that already has actions wins over a sidecar that carries actions of its own, so that sidecar is not migrated.
    // A "no_actions" or "rule" sidecar carries no actions, only the notify setting that has to be folded into the rule's own actions.
    const migratingSOs = legacyRuleActionsSOs.filter((savedObject) => {
      const ruleId = getRuleId(savedObject);
      return (
        ruleId === undefined ||
        !ruleIdsWithActions.has(ruleId) ||
        hasNoThrottledActions(savedObject.attributes)
      );
    });

    const transformedActionsByRuleId: Record<
      string,
      { transformedActions: RawRuleAction[]; transformedReferences: SavedObjectReference[] }
    > = {};

    await asyncForEach(migratingSOs, async (savedObject) => {
      const ruleId = getRuleId(savedObject);
      if (ruleId === undefined) {
        throw new Error('Failed to find rule reference on legacy action Saved Object');
      }

      if (hasNoThrottledActions(savedObject.attributes)) {
        // Still register the rule so that bulkMigrateLegacyActions resets
        // notifyWhen/throttle and adds per-action frequency to existing actions,
        // even though there are no new throttled actions to migrate from the sidecar.
        transformedActionsByRuleId[ruleId] = { transformedActions: [], transformedReferences: [] };
        return;
      }
      const transformedActions = transformFromLegacyActions(
        savedObject.attributes,
        savedObject.references
      );
      const transformedReferences = savedObject.references.filter(({ type }) => type === 'action');

      if (!skipActionsValidation) {
        const rule = rules.find((r) => r.id === ruleId);
        if (rule == null) {
          throw new Error(`Failed to find rule id: ${ruleId} for validating migrated actions`);
        }
        await validateTransformedActions({
          context,
          actions: transformedActions,
          actionsReferences: transformedReferences,
          rule,
        });
      }
      transformedActionsByRuleId[ruleId] = { transformedActions, transformedReferences };
    });

    // Rules that will not be saved with migrated actions have nothing to lose, so their legacy
    // objects can go now. The others are deleted by the caller once the rule is saved.
    const ruleIdsToCleanUpNow = rules
      .map(({ id }) => id)
      .filter((id) => transformedActionsByRuleId[id] === undefined);
    const hasLegacyObjectsToDiscard =
      siemNotificationRuleIds.length > 0 || migratingSOs.length < legacyRuleActionsSOs.length;
    if (hasLegacyObjectsToDiscard) {
      await deleteLegacyActionsForRules(context, ruleIdsToCleanUpNow);
    }

    return transformedActionsByRuleId;
  } catch (e) {
    context.logger.debug(`Migration has failed for SIEM rules: ${e.message}`);
    throw e;
  }
};

const validateTransformedActions = async ({
  context,
  actions,
  actionsReferences,
  rule,
}: {
  context: RulesClientContext;
  actions: RawRuleAction[];
  actionsReferences: SavedObjectReference[];
  rule: SavedObject<RawRule>;
}) => {
  const ruleType = context.ruleTypeRegistry.get(rule.attributes.alertTypeId);
  await validateActions(context, ruleType, {
    ...rule.attributes,
    // set to undefined to avoid both per-action and rule level values clashing
    throttle: undefined,
    notifyWhen: undefined,
    actions: transformRawActionsToDomainActions({
      ruleId: rule.id,
      actions,
      references: actionsReferences,
      isSystemAction: context.isSystemAction,
    }),
  });
};
