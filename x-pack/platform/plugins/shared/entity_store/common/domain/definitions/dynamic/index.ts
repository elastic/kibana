/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ATTRIBUTE_NAME_PATTERN,
  INDEX_PATTERN_PATTERN,
  LITERAL_FIELD_PATH_PATTERN,
  MAX_ATTRIBUTE_NAME_LENGTH,
  MAX_ATTRIBUTES_PER_SOURCE,
  MAX_FIELD_PATH_LENGTH,
  MAX_FILTER_LENGTH,
  MAX_INDEX_PATTERN_LENGTH,
  MAX_SOURCES,
  MAX_VALUE_LABEL_LENGTH,
  MAX_VALUE_LABELS,
  dynamicAttributeSchema,
  dynamicBlockSchema,
  dynamicSourceSchema,
  dynamicValueLabelsSchema,
  isLiteralFieldPath,
  literalFieldPathSchema,
} from './dynamic_block_schema';
export type {
  DynamicAttribute,
  DynamicBlock,
  DynamicSource,
  DynamicValueLabels,
} from './dynamic_block_schema';
export { assertDynamicDefinitionRules } from './dynamic_definition_rules';
