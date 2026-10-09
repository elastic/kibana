/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { RESOLUTION_RULE_KINDS, RESOLUTION_RULE_IDS } from '../../../../../common';
import { EntityResolutionRuleTypeName } from './constants';

const entityResolutionRuleAttributesSchema = schema.object({
  id: schema.oneOf([
    schema.literal(RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH),
    schema.literal(RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION),
  ]),
  kind: schema.oneOf([
    schema.literal(RESOLUTION_RULE_KINDS.SAME_FIELD),
    schema.literal(RESOLUTION_RULE_KINDS.RELATED_USER_ALIAS_RESOLUTION),
  ]),
  managed: schema.boolean(),
  enabled: schema.boolean(),
});

const version1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    create: entityResolutionRuleAttributesSchema,
    forwardCompatibility: entityResolutionRuleAttributesSchema.extends({}, { unknowns: 'ignore' }),
  },
};

export const EntityResolutionRuleType: SavedObjectsType = {
  name: EntityResolutionRuleTypeName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    // Not searching by any attributes; rule id is the saved object id.
    properties: {},
  },
  modelVersions: { 1: version1 },
  hiddenFromHttpApis: true,
};

export { EntityResolutionRuleAttributes, EntityResolutionRuleTypeName } from './constants';
