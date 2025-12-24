/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObject, SavedObjectsServiceSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

import type { RawEsqlRule } from './schemas/raw_esql_rule';
import { esqlRuleMappings } from './esql_rule_mappings';
import { esqlRuleModelVersions } from './model_versions';

export const ESQL_RULE_SAVED_OBJECT_TYPE = 'alerting_esql_rule';

export const EsqlRuleAttributesToEncrypt = ['apiKey'];
export const EsqlRuleAttributesIncludedInAAD = [
  'enabled',
  'name',
  'tags',
  'schedule',
  'esql',
  'timeField',
  'lookbackWindow',
  'groupKey',
  'apiKeyOwner',
  'apiKeyCreatedByUser',
  'scheduledTaskId',
  'createdBy',
  'createdAt',
  'updatedBy',
  'updatedAt',
];

export function setupSavedObjects({
  savedObjects,
  encryptedSavedObjects,
  logger,
}: {
  savedObjects: SavedObjectsServiceSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  logger: Logger;
}) {
  savedObjects.registerType({
    name: ESQL_RULE_SAVED_OBJECT_TYPE,
    indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
    hidden: true,
    namespaceType: 'multiple-isolated',
    convertToMultiNamespaceTypeVersion: '8.0.0',
    mappings: esqlRuleMappings,
    management: {
      importableAndExportable: false,
      getTitle(esqlRuleSavedObject: SavedObject<RawEsqlRule>) {
        return `ES|QL Rule: [${esqlRuleSavedObject.attributes.name}]`;
      },
    },
    modelVersions: esqlRuleModelVersions,
  });

  encryptedSavedObjects.registerType({
    type: ESQL_RULE_SAVED_OBJECT_TYPE,
    enforceRandomId: false,
    attributesToEncrypt: new Set(EsqlRuleAttributesToEncrypt),
    attributesToIncludeInAAD: new Set(EsqlRuleAttributesIncludedInAAD),
  });

  logger.debug(`Registered saved object type [${ESQL_RULE_SAVED_OBJECT_TYPE}]`);
}

export type { RawEsqlRule } from './schemas/raw_esql_rule';
