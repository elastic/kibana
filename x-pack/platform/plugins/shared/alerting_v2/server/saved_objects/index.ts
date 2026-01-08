/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObject, SavedObjectsServiceSetup } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

import type { RuleSavedObjectAttributes } from './schemas/rule_saved_object_attributes';
import { ruleMappings } from './rule_mappings';
import { ruleModelVersions } from './model_versions';

export const RULE_SAVED_OBJECT_TYPE = 'alerting_rule';

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
        return `Rule: [${esqlRuleSavedObject.attributes.name}]`;
      },
    },
    modelVersions: ruleModelVersions,
  });
}

export type { RuleSavedObjectAttributes } from './schemas/rule_saved_object_attributes';
