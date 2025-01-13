/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { isRuleType, ruleTypeMappings } from '@kbn/securitysolution-rules';
import { RawRule } from '../../../types';
import { FILEBEAT_7X_INDICATOR_PATH } from '../constants';
import {
  createEsoMigration,
  isDetectionEngineAADRuleType,
  isSiemSignalsRuleType,
  pipeMigrations,
} from '../utils';

function addThreatIndicatorPathToThreatMatchRules(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  return isSiemSignalsRuleType(doc) &&
    doc.attributes.params?.type === 'threat_match' &&
    !doc.attributes.params.threatIndicatorPath
    ? {
        ...doc,
        attributes: {
          ...doc.attributes,
          params: {
            ...doc.attributes.params,
            threatIndicatorPath: FILEBEAT_7X_INDICATOR_PATH,
          },
        },
      }
    : doc;
}

function addSecuritySolutionAADRuleTypes(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  const ruleType = doc.attributes.params.type;
  return isSiemSignalsRuleType(doc) && isRuleType(ruleType)
    ? {
        ...doc,
        attributes: {
          ...doc.attributes,
          alertTypeId: ruleTypeMappings[ruleType],
          enabled: false,
          params: {
            ...doc.attributes.params,
            outputIndex: '',
          },
        },
      }
    : doc;
}

function addSecuritySolutionAADRuleTypeTags(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  const ruleType = doc.attributes.params.type;
  return isDetectionEngineAADRuleType(doc) && isRuleType(ruleType)
    ? {
        ...doc,
        attributes: {
          ...doc.attributes,
          // If the rule is disabled at this point, then the rule has not been re-enabled after
          // running the 8.0.0 migrations. If `doc.attributes.scheduledTaskId` exists, then the
          // rule was enabled prior to running the migration. Thus we know we should add the
          // tag to indicate it was auto-disabled.
          tags:
            !doc.attributes.enabled && doc.attributes.scheduledTaskId
              ? [...(doc.attributes.tags ?? []), 'auto_disabled_8.0']
              : doc.attributes.tags ?? [],
        },
      }
    : doc;
}

// This fixes an issue whereby metrics.alert.inventory.threshold rules had the
// group for actions incorrectly spelt as metrics.invenotry_threshold.fired vs metrics.inventory_threshold.fired
function fixInventoryThresholdGroupId(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  if (doc.attributes.alertTypeId === 'metrics.alert.inventory.threshold') {
    const {
      attributes: { actions },
    } = doc;

    const updatedActions = actions
      ? actions.map((action) => {
          // Wrong spelling
          if (action.group === 'metrics.invenotry_threshold.fired') {
            return {
              ...action,
              group: 'metrics.inventory_threshold.fired',
            };
          } else {
            return action;
          }
        })
      : [];

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        actions: updatedActions,
      },
    };
  } else {
    return doc;
  }
}

export const getMigrations800 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawRule>): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(
      addThreatIndicatorPathToThreatMatchRules,
      addSecuritySolutionAADRuleTypes,
      fixInventoryThresholdGroupId
    )
  );

export const getMigrations801 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawRule>): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(addSecuritySolutionAADRuleTypeTags)
  );
