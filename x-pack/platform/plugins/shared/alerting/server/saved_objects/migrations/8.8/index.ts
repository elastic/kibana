/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { createEsoMigration, isDetectionEngineAADRuleType, pipeMigrations } from '../utils';
import { RawRule } from '../../../types';
import { transformToAlertThrottle } from '../../../rules_client/lib/siem_legacy_actions/transform_to_alert_throttle';
import { transformToNotifyWhen } from '../../../rules_client/lib/siem_legacy_actions/transform_to_notify_when';

function addRevision(doc: SavedObjectUnsanitizedDoc<RawRule>): SavedObjectUnsanitizedDoc<RawRule> {
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      revision: isDetectionEngineAADRuleType(doc) ? (doc.attributes.params.version as number) : 0,
    },
  };
}

function addActionUuid(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  const {
    attributes: { actions },
  } = doc;

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      actions: actions
        ? actions.map((action) => ({
            ...action,
            uuid: uuidv4(),
          }))
        : [],
    },
  };
}

function addSecuritySolutionActionsFrequency(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  if (isDetectionEngineAADRuleType(doc)) {
    const {
      attributes: { throttle, actions },
    } = doc;

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        actions: actions
          ? actions.map((action) => ({
              ...action,
              // Till now SIEM worked without action level frequencies. Instead rule level `throttle` and `notifyWhen` used
              frequency: action.frequency ?? {
                summary: true,
                notifyWhen: transformToNotifyWhen(throttle) ?? 'onActiveAlert',
                throttle: transformToAlertThrottle(throttle),
              },
            }))
          : [],
      },
    };
  }
  return doc;
}

function unmuteSecuritySolutionCustomRules(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  if (!isDetectionEngineAADRuleType(doc)) {
    return doc;
  }

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      muteAll: false,
    },
  };
}

export const getMigrations880 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawRule>): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(
      addActionUuid,
      addRevision,
      addSecuritySolutionActionsFrequency,
      unmuteSecuritySolutionCustomRules
    )
  );
