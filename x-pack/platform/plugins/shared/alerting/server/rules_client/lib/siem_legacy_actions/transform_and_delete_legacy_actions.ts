/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
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

type FindAndTransformLegacyActionsReturn = Promise<{
  transformedActionsByRuleId: Record<
    string,
    {
      transformedActions: RawRuleAction[];
      transformedReferences: SavedObjectReference[];
    }
  >;
  sidecarIdsToDeleteNow: string[];
  ruleIdsToDeleteNotificationRulesOf: string[];
}>;

// ruleThrottle can have special values 'no_actions' or 'rule', or a duration like e.g. '1h'
// 'rule' means actions fire each time the rule runs, whereas a duration means the actions are
// throttled to only fire once per the specified time duration
const hasThrottledActions = ({ ruleThrottle }: LegacyIRuleActionsAttributes): boolean =>
  ruleThrottle !== 'no_actions' && ruleThrottle !== 'rule';

const getConnectorId = (
  references: SavedObjectReference[],
  actionRef: string
): string | undefined =>
  references.find(({ name, type }) => name === actionRef && type === 'action')?.id;

/**
 * True when the rule already holds every action of a (throttled) sidecar, matched by connector, group and params.
 * That happens when a previous migration saved the rule but could not delete the sidecar.
 */
const ruleHasAllSidecarActions = (
  rule: SavedObject<RawRule>,
  sidecar: SavedObject<LegacyIRuleActionsAttributes>
): boolean => {
  const sidecarActions = sidecar.attributes.actions;
  if (sidecarActions.length === 0) {
    return false;
  }
  const unmatchedRuleActions = [...rule.attributes.actions];

  const ruleContainsSidecarAction = (sidecarAction: (typeof sidecarActions)[number]): boolean => {
    const connectorId = getConnectorId(sidecar.references, sidecarAction.actionRef);
    if (connectorId === undefined) {
      return false;
    }
    const matchIndex = unmatchedRuleActions.findIndex(
      (ruleAction) =>
        ruleAction.group === sidecarAction.group &&
        isEqual(ruleAction.params, sidecarAction.params) &&
        getConnectorId(rule.references, ruleAction.actionRef) === connectorId
    );
    if (matchIndex === -1) {
      return false;
    }
    // A rule action can match only one sidecar action, so a match is removed from the pool of unmatched rule actions.
    unmatchedRuleActions.splice(matchIndex, 1);
    return true;
  };

  return sidecarActions.every(ruleContainsSidecarAction);
};

type LegacySidecar = SavedObject<LegacyIRuleActionsAttributes>;

const toRuleReferences = (ruleIds: string[]) =>
  ruleIds.map((id) => ({ type: RULE_SAVED_OBJECT_TYPE, id }));

// The legacy `siem.notifications` rules that point at the given rules
const findNotificationRuleIds = async (
  context: RulesClientContext,
  ruleIds: string[]
): Promise<string[]> => {
  const notificationRules = await findRules(context, {
    options: {
      filter: 'alert.attributes.alertTypeId:(siem.notifications)',
      hasReference: toRuleReferences(ruleIds),
    },
  });
  return notificationRules?.data.map((rule) => rule.id) ?? [];
};

// The legacy sidecar saved objects that point at the given rules
const findSidecars = async (
  context: RulesClientContext,
  ruleIds: string[]
): Promise<LegacySidecar[]> => {
  const sidecars = await context.unsecuredSavedObjectsClient.find<LegacyIRuleActionsAttributes>({
    type: legacyRuleActionsSavedObjectType,
    hasReference: toRuleReferences(ruleIds),
  });
  return sidecars?.saved_objects ?? [];
};

const deleteSidecarsById = async (context: RulesClientContext, sidecarIds: string[]) => {
  if (sidecarIds.length > 0) {
    await context.unsecuredSavedObjectsClient.bulkDelete(
      sidecarIds.map((id) => ({ type: legacyRuleActionsSavedObjectType, id }))
    );
  }
};

const deleteNotificationRulesById = async (
  context: RulesClientContext,
  notificationRuleIds: string[]
) => {
  if (notificationRuleIds.length > 0) {
    await bulkDeleteRules(context, { ids: notificationRuleIds });
  }
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * Deletes the sidecars of the given rules and the sidecars' `siem.notifications` rules, found by their reference to those rules.
 * Call it only after the rules carrying the migrated actions have been saved. Failures are logged and
 * swallowed: a leftover sidecar is detected and discarded the next time the rule is migrated.
 */
export const deleteLegacyActionsForRules = async (
  context: RulesClientContext,
  ruleIds: string[]
): Promise<void> => {
  if (ruleIds.length === 0) {
    return;
  }
  try {
    const [notificationRuleIds, sidecars] = await Promise.all([
      findNotificationRuleIds(context, ruleIds),
      findSidecars(context, ruleIds),
    ]);
    await Promise.all([
      deleteNotificationRulesById(context, notificationRuleIds),
      deleteSidecarsById(
        context,
        sidecars.map(({ id }) => id)
      ),
    ]);
  } catch (e) {
    context.logger.warn(`Failed to delete legacy actions for SIEM rules: ${e.message}`);
  }
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * Deletes sidecars by id when nothing is waiting to be saved from them. Failures are logged and swallowed.
 */
export const deleteMigratedSidecars = async (
  context: RulesClientContext,
  sidecarIds: string[]
): Promise<void> => {
  try {
    await deleteSidecarsById(context, sidecarIds);
  } catch (e) {
    context.logger.warn(`Failed to delete legacy sidecars for SIEM rules: ${e.message}`);
  }
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * Deletes the `siem.notifications` rules that point at the given rules, when nothing is waiting to be saved
 * for those rules. Failures are logged and swallowed.
 */
export const deleteNotificationRulesOfRules = async (
  context: RulesClientContext,
  ruleIds: string[]
): Promise<void> => {
  if (ruleIds.length === 0) {
    return;
  }
  try {
    await deleteNotificationRulesById(context, await findNotificationRuleIds(context, ruleIds));
  } catch (e) {
    context.logger.warn(`Failed to delete legacy notification rules for SIEM rules: ${e.message}`);
  }
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * Retrieves legacy actions for SIEM rules and transforms them. It does not delete anything.
 * A throttled sidecar whose actions are all on the rule already was migrated by a previous run, so it is
 * not merged again.
 * @param context RulesClient context
 * @param rules rules to migrate
 * @returns `transformedActionsByRuleId`: the actions to save, by rule id. Their legacy objects must be deleted
 * only after the rule is saved (`deleteLegacyActionsForRules`).
 * `sidecarIdsToDeleteNow`: sidecars whose actions are on their rule already, so nothing is waiting on them.
 * `ruleIdsToDeleteNotificationRulesOf`: rules with nothing to save, whose `siem.notifications` rules can go now.
 */
export const findAndTransformLegacyActions: FindAndTransformLegacyActions = async (
  context,
  rules,
  skipActionsValidation
) => {
  try {
    if (rules.length === 0) {
      return {
        transformedActionsByRuleId: {},
        sidecarIdsToDeleteNow: [],
        ruleIdsToDeleteNotificationRulesOf: [],
      };
    }

    /**
     * On update / patch I'm going to take the actions as they are, better off taking rules client.find (siem.notification) result
     * and putting that into the actions array of the rule, then set the rules onThrottle property, notifyWhen and throttle from null -> actual value (1hr etc..)
     * Then use the rules client to delete the siem.notification
     * Then with the legacy Rule Actions saved object type, just delete it.
     */
    const ruleIds = rules.map(({ id }) => id);
    const [notificationRuleIds, legacyRuleActionsSOs] = await Promise.all([
      findNotificationRuleIds(context, ruleIds),
      findSidecars(context, ruleIds),
    ]);

    const getRuleId = (savedObject: SavedObject): string | undefined =>
      savedObject.references.find(({ type }) => type === RULE_SAVED_OBJECT_TYPE)?.id;
    const alreadyMigratedSidecarIds: string[] = [];

    const transformedActionsByRuleId: Record<
      string,
      { transformedActions: RawRuleAction[]; transformedReferences: SavedObjectReference[] }
    > = {};

    await asyncForEach(legacyRuleActionsSOs, async (savedObject) => {
      const ruleId = getRuleId(savedObject);
      if (ruleId === undefined) {
        throw new Error('Failed to find rule reference on legacy action Saved Object');
      }

      if (!hasThrottledActions(savedObject.attributes)) {
        // There are no actions to copy: the actions that run are the ones already on the rule.
        // The rule is still part of the result, with nothing to add, because its legacy notify
        // setting still has to be applied to those actions.
        transformedActionsByRuleId[ruleId] = { transformedActions: [], transformedReferences: [] };
        return;
      }
      const rule = rules.find((r) => r.id === ruleId);
      if (rule != null && ruleHasAllSidecarActions(rule, savedObject)) {
        alreadyMigratedSidecarIds.push(savedObject.id);
        return;
      }

      const transformedActions = transformFromLegacyActions(
        savedObject.attributes,
        savedObject.references
      );
      const transformedReferences = savedObject.references.filter(({ type }) => type === 'action');

      if (!skipActionsValidation) {
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

    // Rules with nothing to save have nothing to lose, so their notification rules can be deleted now
    const ruleIdsToDeleteNotificationRulesOf =
      notificationRuleIds.length > 0
        ? ruleIds.filter((id) => transformedActionsByRuleId[id] === undefined)
        : [];

    return {
      transformedActionsByRuleId,
      sidecarIdsToDeleteNow: alreadyMigratedSidecarIds,
      ruleIdsToDeleteNotificationRulesOf,
    };
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
