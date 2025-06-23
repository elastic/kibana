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

type TransformAndDeleteLegacyActions = (
  context: RulesClientContext,
  rules: Array<SavedObject<RawRule>>,
  skipActionsValidation: boolean
) => TransformAndDeleteLegacyActionsReturn;

type TransformAndDeleteLegacyActionsReturn = Promise<
  Record<
    string,
    {
      transformedActions: RawRuleAction[];
      transformedReferences: SavedObjectReference[];
    }
  >
>;

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * retrieves legacy actions for SIEM rule and deletes associated sidecar SO
 * @param context RulesClient context
 * @param params.ruleId - id of rule to be migrated
 * @returns
 */
export const transformAndDeleteLegacyActions: TransformAndDeleteLegacyActions = async (
  context,
  rules,
  skipActionsValidation
) => {
  const { unsecuredSavedObjectsClient } = context;
  try {
    if (rules.length === 0) {
      return {};
    }

    /**
     * On update / patch I'm going to take the actions as they are, better off taking rules client.find (siem.notification) result
     * and putting that into the actions array of the rule, then set the rules onThrottle property, notifyWhen and throttle from null -> actual value (1hr etc..)
     * Then use the rules client to delete the siem.notification
     * Then with the legacy Rule Actions saved object type, just delete it.
     */
    // find it using the references array, not params.ruleAlertId
    const [siemNotifications, legacyRuleActionsSOs] = await Promise.all([
      findRules(context, {
        options: {
          filter: 'alert.attributes.alertTypeId:(siem.notifications)',
          hasReference: rules.map((rule) => ({
            type: RULE_SAVED_OBJECT_TYPE,
            id: rule.id,
          })),
        },
      }),
      unsecuredSavedObjectsClient.find<LegacyIRuleActionsAttributes>({
        type: legacyRuleActionsSavedObjectType,
        hasReference: rules.map((rule) => ({
          type: RULE_SAVED_OBJECT_TYPE,
          id: rule.id,
        })),
      }),
    ]);

    const siemNotificationsExist = siemNotifications != null && siemNotifications.data.length > 0;
    const legacyRuleNotificationSOsExist =
      legacyRuleActionsSOs != null && legacyRuleActionsSOs.saved_objects.length > 0;

    // Assumption: if no legacy sidecar SO or notification rule types exist
    // that reference the rule in question, assume rule actions are not legacy
    if (!siemNotificationsExist && !legacyRuleNotificationSOsExist) {
      return {};
    }

    const deleteLegacyActions = async () => {
      await Promise.all([
        // If the legacy notification rule type ("siem.notification") exist,
        // migration and cleanup are needed
        siemNotificationsExist &&
          bulkDeleteRules(context, { ids: siemNotifications.data.map((rule) => rule.id) }),
        // Delete the legacy sidecar SO if it exists
        legacyRuleNotificationSOsExist &&
          unsecuredSavedObjectsClient.bulkDelete(
            legacyRuleActionsSOs.saved_objects.map((savedObject) => ({
              type: legacyRuleActionsSavedObjectType,
              id: savedObject.id,
            }))
          ),
      ]);
    };

    const transformedActionsByRuleId: Record<
      string,
      { transformedActions: RawRuleAction[]; transformedReferences: SavedObjectReference[] }
    > = {};

    await asyncForEach(legacyRuleActionsSOs.saved_objects, async (savedObject) => {
      const ruleReference = savedObject.references.find(
        (reference) => reference.type === RULE_SAVED_OBJECT_TYPE
      );
      if (ruleReference == null) {
        throw new Error('Failed to find rule reference on legacy action Saved Object');
      }

      // ruleThrottle can have special values 'no_actions' or 'rule', or a duration like e.g. '1h'
      // 'rule' means actions fire each time the rule runs, whereas a duration means the actions are
      // throttled to only fire once per the specified time duration
      const hasNoThrottledActions =
        savedObject.attributes.ruleThrottle === 'no_actions' ||
        savedObject.attributes.ruleThrottle === 'rule';

      if (hasNoThrottledActions) {
        return;
      }

      const ruleId = ruleReference.id;
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

    await deleteLegacyActions();
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
