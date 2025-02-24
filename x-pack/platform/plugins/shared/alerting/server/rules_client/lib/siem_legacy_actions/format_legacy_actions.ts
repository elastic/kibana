/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { SavedObjectsFindOptionsReference, Logger } from '@kbn/core/server';
import pMap from 'p-map';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { RuleAction, Rule } from '../../../types';
import type { RuleExecutorServices } from '../../..';
import { injectReferencesIntoActions } from '../../common';
import { transformToNotifyWhen } from './transform_to_notify_when';
import { transformFromLegacyActions } from './transform_legacy_actions';
import { LegacyIRuleActionsAttributes, legacyRuleActionsSavedObjectType } from './types';
import { transformToAlertThrottle } from './transform_to_alert_throttle';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
interface LegacyGetBulkRuleActionsSavedObject {
  alertIds: string[];
  savedObjectsClient: RuleExecutorServices['savedObjectsClient'];
  logger: Logger;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export interface LegacyActionsObj {
  ruleThrottle: string | null;
  legacyRuleActions: RuleAction[];
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * this function finds all legacy actions associated with rules in bulk
 * it's useful for such methods as find, so we do not request legacy actions in a separate request per rule
 * @params params.alertIds - list of rule ids to look for legacy actions for
 * @params params.savedObjectsClient - savedObjectsClient
 * @params params.logger - logger
 * @returns map of legacy actions objects per rule with legacy actions
 */
export const legacyGetBulkRuleActionsSavedObject = async ({
  alertIds,
  savedObjectsClient,
  logger,
}: LegacyGetBulkRuleActionsSavedObject): Promise<Record<string, LegacyActionsObj>> => {
  const references = alertIds.map<SavedObjectsFindOptionsReference>((alertId) => ({
    id: alertId,
    type: RULE_SAVED_OBJECT_TYPE,
  }));
  const errors: unknown[] = [];
  const results = await pMap(
    chunk(references, 1000),
    async (referencesChunk) => {
      try {
        return savedObjectsClient.find<LegacyIRuleActionsAttributes>({
          // here we looking legacyRuleActionsSavedObjectType, as not all of rules create `siem.notifications`
          // more information on that can be found in https://github.com/elastic/kibana/pull/130511 PR
          type: legacyRuleActionsSavedObjectType,
          perPage: 10000,
          hasReference: referencesChunk,
        });
      } catch (error) {
        logger.error(
          `Error fetching rule actions: ${error instanceof Error ? error.message : String(error)}`
        );
        errors.push(error);
        return [];
      }
    },
    { concurrency: 1 }
  );
  const actionSavedObjects = results.flat().flatMap((r) => r.saved_objects);

  if (errors.length) {
    throw new AggregateError(errors, 'Error fetching rule actions');
  }

  return actionSavedObjects.reduce((acc: { [key: string]: LegacyActionsObj }, savedObject) => {
    const ruleAlertId = savedObject.references.find((reference) => {
      // Find the first rule alert and assume that is the one we want since we should only ever have 1.
      return reference.type === RULE_SAVED_OBJECT_TYPE;
    });
    // We check to ensure we have found a "ruleAlertId" and hopefully we have.
    const ruleAlertIdKey = ruleAlertId != null ? ruleAlertId.id : undefined;
    if (ruleAlertIdKey != null) {
      const legacyRawActions = transformFromLegacyActions(
        savedObject.attributes,
        savedObject.references
      );
      acc[ruleAlertIdKey] = {
        ruleThrottle: savedObject.attributes.ruleThrottle,
        legacyRuleActions: injectReferencesIntoActions(
          ruleAlertIdKey,
          legacyRawActions,
          savedObject.references
        ) // remove uuid from action, as this uuid is not persistent
          .map(({ uuid, ...action }) => ({
            ...action,
          })) as RuleAction[],
      };
    } else {
      logger.error(
        `Security Solution notification (Legacy) Was expecting to find a reference of type "alert" within ${savedObject.references} but did not. Skipping this notification.`
      );
    }
    return acc;
  }, {});
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * formats rules with associated SIEM legacy actions, if any legacy actions present
 * @param rules - list of rules to format
 * @param params - logger, savedObjectsClient
 * @returns
 */
export const formatLegacyActions = async <T extends Rule>(
  rules: T[],
  { logger, savedObjectsClient }: Omit<LegacyGetBulkRuleActionsSavedObject, 'alertIds'>
): Promise<T[]> => {
  try {
    const res = await legacyGetBulkRuleActionsSavedObject({
      alertIds: rules.map((rule) => rule.id),
      savedObjectsClient,
      logger,
    });

    return rules.map((rule) => {
      const legacyRuleActionsMatch = res[rule.id];
      if (!legacyRuleActionsMatch) {
        return rule;
      }

      const { legacyRuleActions, ruleThrottle } = legacyRuleActionsMatch;
      return {
        ...rule,
        actions: [...rule.actions, ...legacyRuleActions],
        throttle: transformToAlertThrottle(
          (legacyRuleActions.length ? ruleThrottle : rule.throttle) ?? 'no_actions'
        ),
        notifyWhen: transformToNotifyWhen(ruleThrottle),
        // muteAll property is disregarded in further rule processing in Security Solution when legacy actions are present.
        // So it should be safe to set it as false, so it won't be displayed to user as w/o actions see transformFromAlertThrottle method
        muteAll: legacyRuleActions.length ? false : rule.muteAll,
      };
    });
  } catch (e) {
    const ruleIds = rules.map((rule) => rule.id).join(', ');
    logger.error(
      `formatLegacyActions(): Failed to read legacy actions for SIEM rules ${ruleIds}: ${e.message}`
    );
    return rules;
  }
};
