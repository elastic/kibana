/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';
import {
  CustomResolutionRuleTypeName,
  MAX_CUSTOM_RULE_EXPRESSION_LENGTH,
  MAX_CUSTOM_RULE_NAME_LENGTH,
  MAX_CUSTOM_RULE_NAMESPACES,
  MAX_CUSTOM_RULE_NAMESPACE_LENGTH,
} from './constants';

const customResolutionRuleAttributesSchemaV1 = schema.object({
  name: schema.string({ minLength: 1, maxLength: MAX_CUSTOM_RULE_NAME_LENGTH }),
  // Not `namespaces`: that name is the saved object's own spaces field.
  entityNamespaces: schema.arrayOf(
    schema.string({ minLength: 1, maxLength: MAX_CUSTOM_RULE_NAMESPACE_LENGTH }),
    { minSize: 1, maxSize: MAX_CUSTOM_RULE_NAMESPACES }
  ),
  filter: schema.maybe(
    schema.string({ minLength: 1, maxLength: MAX_CUSTOM_RULE_EXPRESSION_LENGTH })
  ),
  matchValue: schema.string({ minLength: 1, maxLength: MAX_CUSTOM_RULE_EXPRESSION_LENGTH }),
  declineSameNamespaceDuplicates: schema.boolean(),
  enabled: schema.boolean(),
});

export type CustomResolutionRuleAttributes = TypeOf<typeof customResolutionRuleAttributesSchemaV1>;

const version1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    create: customResolutionRuleAttributesSchemaV1,
    forwardCompatibility: customResolutionRuleAttributesSchemaV1.extends(
      {},
      { unknowns: 'ignore' }
    ),
  },
};

export const CustomResolutionRuleType: SavedObjectsType = {
  name: CustomResolutionRuleTypeName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    // No attribute is searched or sorted on.
    properties: {},
  },
  modelVersions: { 1: version1 },
  hiddenFromHttpApis: true,
};
