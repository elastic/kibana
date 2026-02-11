/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { Logger, SavedObject, SavedObjectsServiceSetup } from '@kbn/core/server';
import { notificationPolicyModelVersions, ruleModelVersions } from './model_versions';
import { notificationPolicyMappings } from './notification_policy_mappings';
import { ruleMappings } from './rule_mappings';
import type { NotificationPolicySavedObjectAttributes } from './schemas/notification_policy_saved_object_attributes';
import type { RuleSavedObjectAttributes } from './schemas/rule_saved_object_attributes';

export const RULE_SAVED_OBJECT_TYPE = 'alerting_rule';
export const NOTIFICATION_POLICY_SAVED_OBJECT_TYPE = 'alerting_notification_policy';

export function registerSavedObjects({
  savedObjects,
  logger,
}: {
  savedObjects: SavedObjectsServiceSetup;
  logger: Logger;
}) {
  savedObjects.registerType({
    name: RULE_SAVED_OBJECT_TYPE,
    indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
    hidden: true,
    namespaceType: 'multiple-isolated',
    mappings: ruleMappings,
    management: {
      importableAndExportable: false,
      getTitle(esqlRuleSavedObject: SavedObject<RuleSavedObjectAttributes>) {
        return `Rule: [${esqlRuleSavedObject.attributes.metadata.name}]`;
      },
    },
    modelVersions: ruleModelVersions,
  });

  savedObjects.registerType({
    name: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
    indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
    hidden: true,
    namespaceType: 'multiple-isolated',
    mappings: notificationPolicyMappings,
    management: {
      importableAndExportable: false,
      getTitle(so: SavedObject<NotificationPolicySavedObjectAttributes>) {
        return `Notification Policy: [${so.attributes.name}]`;
      },
    },
    modelVersions: notificationPolicyModelVersions,
  });
}

export type { NotificationPolicySavedObjectAttributes } from './schemas/notification_policy_saved_object_attributes';
export type { RuleSavedObjectAttributes } from './schemas/rule_saved_object_attributes';
