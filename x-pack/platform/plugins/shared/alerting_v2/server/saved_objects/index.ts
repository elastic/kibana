/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObject, SavedObjectsServiceSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import {
  actionPolicyModelVersions,
  apiKeyPendingInvalidationModelVersions,
  ruleModelVersions,
} from './model_versions';
import { apiKeyPendingInvalidationMappings } from './api_key_pending_invalidation_mappings';
import { actionPolicyMappings } from './action_policy_mappings';
import { ruleMappings } from './rule_mappings';
import type { ActionPolicySavedObjectAttributes } from './schemas/action_policy_saved_object_attributes';
import type { RuleSavedObjectAttributes } from './schemas/rule_saved_object_attributes';
import {
  ACTION_POLICY_SAVED_OBJECT_TYPE,
  API_KEY_PENDING_INVALIDATION_TYPE,
  RULE_SAVED_OBJECT_TYPE,
} from '../../common/saved_object_types';
import { ALERTING_LOG_CODES } from '../lib/errors/error_codes';
import type { LoggerServiceContract } from '../lib/services/logger_service/logger_service';

export {
  RULE_SAVED_OBJECT_TYPE,
  ACTION_POLICY_SAVED_OBJECT_TYPE,
  API_KEY_PENDING_INVALIDATION_TYPE,
};

export const ActionPolicyAttributesToEncrypt = ['apiKey'];

/**
 * Use caution when removing items from this array! These fields are used to
 * construct decryption AAD and must remain to prevent decryption failures.
 */
export const ActionPolicyAttributesIncludedInAAD = ['apiKeyOwner', 'apiKeyCreatedByUser'];

export type ActionPolicyAttributesNotPartiallyUpdatable =
  | 'apiKey'
  | 'apiKeyOwner'
  | 'apiKeyCreatedByUser';

export type PartiallyUpdateableActionPolicyAttributes = Partial<
  Omit<ActionPolicySavedObjectAttributes, ActionPolicyAttributesNotPartiallyUpdatable>
>;

export function registerSavedObjects({
  savedObjects,
  encryptedSavedObjects,
  logger,
}: {
  savedObjects: SavedObjectsServiceSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  logger: LoggerServiceContract;
}) {
  try {
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
  } catch (error) {
    logger.error({
      error,
      code: ALERTING_LOG_CODES.SAVED_OBJECTS_TYPE_REGISTRATION_FAILED,
      labels: { resource: RULE_SAVED_OBJECT_TYPE },
    });
    throw error;
  }

  try {
    savedObjects.registerType({
      name: ACTION_POLICY_SAVED_OBJECT_TYPE,
      indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
      hidden: true,
      namespaceType: 'multiple-isolated',
      mappings: actionPolicyMappings,
      management: {
        importableAndExportable: false,
        getTitle(so: SavedObject<ActionPolicySavedObjectAttributes>) {
          return `Action Policy: [${so.attributes.name}]`;
        },
      },
      modelVersions: actionPolicyModelVersions,
    });
  } catch (error) {
    logger.error({
      error,
      code: ALERTING_LOG_CODES.SAVED_OBJECTS_TYPE_REGISTRATION_FAILED,
      labels: { resource: ACTION_POLICY_SAVED_OBJECT_TYPE },
    });
    throw error;
  }

  try {
    savedObjects.registerType({
      name: API_KEY_PENDING_INVALIDATION_TYPE,
      indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
      hidden: true,
      namespaceType: 'agnostic',
      mappings: apiKeyPendingInvalidationMappings,
      modelVersions: apiKeyPendingInvalidationModelVersions,
    });
  } catch (error) {
    logger.error({
      error,
      code: ALERTING_LOG_CODES.SAVED_OBJECTS_TYPE_REGISTRATION_FAILED,
      labels: { resource: API_KEY_PENDING_INVALIDATION_TYPE },
    });
    throw error;
  }

  try {
    encryptedSavedObjects.registerType({
      type: ACTION_POLICY_SAVED_OBJECT_TYPE,
      enforceRandomId: false,
      attributesToEncrypt: new Set(ActionPolicyAttributesToEncrypt),
      attributesToIncludeInAAD: new Set(ActionPolicyAttributesIncludedInAAD),
    });
  } catch (error) {
    logger.error({
      error,
      code: ALERTING_LOG_CODES.SAVED_OBJECTS_TYPE_REGISTRATION_FAILED,
      labels: { resource: `${ACTION_POLICY_SAVED_OBJECT_TYPE}:encrypted` },
    });
    throw error;
  }
}

export type { ActionPolicySavedObjectAttributes } from './schemas/action_policy_saved_object_attributes';
export type { RuleSavedObjectAttributes } from './schemas/rule_saved_object_attributes';
