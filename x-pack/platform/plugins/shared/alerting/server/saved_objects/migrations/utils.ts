/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import {
  SavedObjectMigrationContext,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { IsMigrationNeededPredicate } from '@kbn/encrypted-saved-objects-plugin/server';

import { RawRule } from '../../types';

type AlertMigration = (
  doc: SavedObjectUnsanitizedDoc<RawRule>,
  context: SavedObjectMigrationContext
) => SavedObjectUnsanitizedDoc<RawRule>;

export function createEsoMigration(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  isMigrationNeededPredicate: IsMigrationNeededPredicate<RawRule, RawRule>,
  migrationFunc: AlertMigration
) {
  return encryptedSavedObjects.createMigration<RawRule, RawRule>({
    isMigrationNeededPredicate,
    migration: migrationFunc,
    shouldMigrateIfDecryptionFails: true, // shouldMigrateIfDecryptionFails flag that applies the migration to undecrypted document if decryption fails
  });
}

export function pipeMigrations(...migrations: AlertMigration[]): AlertMigration {
  return (doc: SavedObjectUnsanitizedDoc<RawRule>, context: SavedObjectMigrationContext) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc, context), doc);
}

// Deprecated in 8.0
export const isSiemSignalsRuleType = (doc: SavedObjectUnsanitizedDoc<RawRule>): boolean =>
  doc.attributes.alertTypeId === 'siem.signals';

export const isEsQueryRuleType = (doc: SavedObjectUnsanitizedDoc<RawRule>) =>
  doc.attributes.alertTypeId === '.es-query';

export const isDetectionEngineAADRuleType = (doc: SavedObjectUnsanitizedDoc<RawRule>): boolean =>
  (Object.values(ruleTypeMappings) as string[]).includes(doc.attributes.alertTypeId);

/**
 * Returns true if the alert type is that of "siem.notifications" which is a legacy notification system that was deprecated in 7.16.0
 * in favor of using the newer alerting notifications system.
 * @param doc The saved object alert type document
 * @returns true if this is a legacy "siem.notifications" rule, otherwise false
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const isSecuritySolutionLegacyNotification = (
  doc: SavedObjectUnsanitizedDoc<RawRule>
): boolean => doc.attributes.alertTypeId === 'siem.notifications';

export const isLogThresholdRuleType = (doc: SavedObjectUnsanitizedDoc<RawRule>) =>
  doc.attributes.alertTypeId === 'logs.alert.document.count';
