/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { Logger, SavedObject, SavedObjectsServiceSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { notificationPolicyModelVersions, ruleModelVersions } from './model_versions';
import { notificationPolicyMappings } from './notification_policy_mappings';
import { ruleMappings } from './rule_mappings';
import type { NotificationPolicySavedObjectAttributes } from './schemas/notification_policy_saved_object_attributes';
import type { RuleSavedObjectAttributes } from './schemas/rule_saved_object_attributes';

export const RULE_SAVED_OBJECT_TYPE = 'alerting_rule';
export const NOTIFICATION_POLICY_SAVED_OBJECT_TYPE = 'alerting_notification_policy';

export const NotificationPolicyAttributesToEncrypt = ['auth.apiKey'];

export const NotificationPolicyAttributesIncludedInAAD = [
  'auth.type',
  'auth.owner',
  'auth.createdByUser',
];

export function registerSavedObjects({
  savedObjects,
  encryptedSavedObjects,
  logger,
}: {
  savedObjects: SavedObjectsServiceSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
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

  encryptedSavedObjects.registerType({
    type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
    enforceRandomId: false,
    attributesToEncrypt: new Set(NotificationPolicyAttributesToEncrypt),
    attributesToIncludeInAAD: new Set(NotificationPolicyAttributesIncludedInAAD),
  });
}

export type { NotificationPolicySavedObjectAttributes } from './schemas/notification_policy_saved_object_attributes';
export type { RuleSavedObjectAttributes } from './schemas/rule_saved_object_attributes';
