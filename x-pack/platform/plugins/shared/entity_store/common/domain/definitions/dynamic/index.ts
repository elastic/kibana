/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  INDEX_PATTERN_PATTERN,
  LITERAL_FIELD_PATH_PATTERN,
  MAX_ATTRIBUTE_NAME_LENGTH,
  MAX_ATTRIBUTES_PER_SOURCE,
  MAX_FIELD_PATH_LENGTH,
  MAX_FILTER_LENGTH,
  MAX_INDEX_PATTERN_LENGTH,
  MAX_DYNAMIC_IDENTITY_FIELDS,
  MAX_METRICS_PER_SOURCE,
  MAX_SOURCES,
  MAX_SUGGESTED_FILTERS,
  MAX_VALUE_LABEL_LENGTH,
  MAX_VALUE_LABELS,
  METRIC_AGGS,
  METRIC_UNITS,
  dynamicAttributeSchema,
  dynamicBlockSchema,
  dynamicMetricSchema,
  dynamicSourceSchema,
  dynamicValueLabelsSchema,
  isLiteralFieldPath,
} from './dynamic_block_schema';
export type {
  DynamicAttribute,
  DynamicBlock,
  DynamicDisplayLabel,
  DynamicMetric,
  DynamicMetricAgg,
  DynamicMetricUnit,
  DynamicSource,
  DynamicValueLabels,
} from './dynamic_block_schema';
export {
  SUGGESTED_FILTER_RULE,
  assertDynamicDefinitionRules,
  getIdentityCompositions,
  getIdentityFields,
  getPresenceFilter,
  METRIC_CONSISTENCY_RULE,
  METRIC_NAME_RULE,
  NO_IDENTITY_ATTRIBUTE_RULE,
  NO_IDENTITY_METRIC_RULE,
  RESERVED_ENTITY_ID_FIELD,
  RESERVED_LAST_SEEN_FIELD,
  SERVABLE_IDENTITY_RULE,
} from './dynamic_definition_rules';
export {
  CHANGE_OVER_RANGE_AGGS,
  CHANGE_OVER_RANGE_MEASUREMENT,
  areMetricAggsEquivalent,
  getMetricMeasurementClass,
} from './metric_measurement';
