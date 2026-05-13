/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Field, Fields } from '../../fields/field';

import { getDefaultProperties, histogram, keyword, scaledFloat } from './mappings';
import type { Properties } from './mappings';
import type { MappingsBuilder, WalkContext } from './mappings_builder';

const DEFAULT_IGNORE_ABOVE = 1024;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export const fieldPath = (groupFieldName: string | undefined, name: string) =>
  groupFieldName ? `${groupFieldName}.${name}` : name;

export const dynamicPathMatch = (path: string) => (path.includes('*') ? path : `${path}.*`);

/**
 * Builds text-like field mapping extras (analyzer, search_analyzer, null_value, ignore_above).
 * For dynamic templates the default ignore_above is intentionally omitted for
 * backwards compatibility; static mappings include it for wildcard fields via generateWildcardMapping.
 */
const buildTextExtras = (field: Field, { isDynamic }: { isDynamic: boolean }): Properties => {
  const mapping: Properties = {};
  if (!isDynamic) {
    if (field.analyzer) mapping.analyzer = field.analyzer;
    if (field.search_analyzer) mapping.search_analyzer = field.search_analyzer;
  }
  if (field.null_value) mapping.null_value = field.null_value;
  if (field.ignore_above) mapping.ignore_above = field.ignore_above;
  return mapping;
};

const buildDateMapping = (field: Field): Properties => {
  const mapping: Properties = {};
  if (field.date_format) mapping.format = field.date_format;
  if (field.name === '@timestamp') mapping.ignore_malformed = false;
  return mapping;
};

export const generateDynamicAndEnabled = (field: Field): Properties => {
  const props: Properties = {};
  if (Object.hasOwn(field, 'enabled')) props.enabled = field.enabled;
  if (Object.hasOwn(field, 'dynamic')) props.dynamic = field.dynamic;
  return props;
};

const generateNestedProps = (field: Field): Properties => {
  const props = generateDynamicAndEnabled(field);
  if (Object.hasOwn(field, 'include_in_parent')) props.include_in_parent = field.include_in_parent;
  if (Object.hasOwn(field, 'include_in_root')) props.include_in_root = field.include_in_root;
  return props;
};

/**
 * Build the `{ type: 'object', dynamic: true, subobjects? }` placeholder used
 * as the static parent of a dynamic-template field and as the result of a
 * dynamic-only group.
 */
export const dynamicObjectParentProps = (subobjects?: boolean): Properties => {
  const props: Properties = { type: 'object', dynamic: true };
  if (subobjects !== undefined) props.subobjects = subobjects;
  return props;
};

const applyTimeSeriesMetric = (props: Properties, field: Field, builder: MappingsBuilder): void => {
  if (builder.isIndexModeTimeSeries && field.metric_type) {
    props.time_series_metric = field.metric_type;
  }
};

const applyTimeSeriesDimension = (
  props: Properties,
  field: Field,
  builder: MappingsBuilder
): void => {
  if (builder.isIndexModeTimeSeries && field.dimension) {
    props.time_series_dimension = field.dimension;
  }
};

// ---------------------------------------------------------------------------
// Handler types
// ---------------------------------------------------------------------------

export interface DynamicMappingResult {
  properties: Properties;
  matchingType: string;
}

export interface MultiFields {
  [key: string]: object;
}

export interface GroupMappingResult {
  fieldProps: Properties;
  /** True when this group's result only comes from dynamic template children, no static props. */
  onlyDynamicTemplateMappings: boolean;
}

/**
 * Per-ES-type handler. Every method is optional: omit a method to silently
 * skip that mapping context. `mapGroup` is only used by the `group` type.
 */
export interface FieldTypeHandler {
  staticMapping?: (
    field: Field,
    builder: MappingsBuilder,
    context: WalkContext
  ) => Properties | undefined;
  dynamicMapping?: (field: Field, builder: MappingsBuilder) => DynamicMappingResult | undefined;
  multiFieldMapping?: (field: Field) => Properties | undefined;
  runtimeMapping?: (field: Field) => Properties | undefined;
  mapGroup?: (
    field: Field,
    builder: MappingsBuilder,
    context: WalkContext
  ) => GroupMappingResult | undefined;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

const keywordType: FieldTypeHandler = {
  staticMapping(field) {
    const props = keyword(field);
    applyMultiFields(props, field);
    return props;
  },
  dynamicMapping(field, builder) {
    const props = keyword(field, true);
    applyMultiFields(props, field);
    applyTimeSeriesDimension(props, field, builder);
    return {
      properties: props,
      matchingType: field.object_type_mapping_type ?? 'string',
    };
  },
  multiFieldMapping(field) {
    return keyword(field);
  },
  runtimeMapping() {
    return { type: 'keyword' };
  },
};

const textLikeType = (esType: string): FieldTypeHandler => ({
  staticMapping(field) {
    const props = {
      ...getDefaultProperties(field),
      ...buildTextExtras(field, { isDynamic: false }),
      type: esType,
    };
    applyMultiFields(props, field);
    return props;
  },
  dynamicMapping(field) {
    const props = {
      ...getDefaultProperties(field),
      ...buildTextExtras(field, { isDynamic: true }),
      type: esType,
    };
    applyMultiFields(props, field);
    return {
      properties: props,
      matchingType: field.object_type_mapping_type ?? 'string',
    };
  },
  multiFieldMapping(field) {
    return { ...buildTextExtras(field, { isDynamic: false }), type: esType };
  },
});

const wildcardType: FieldTypeHandler = {
  staticMapping(field) {
    const props: Properties = {
      ...getDefaultProperties(field),
      ignore_above: DEFAULT_IGNORE_ABOVE,
    };
    if (field.null_value) props.null_value = field.null_value;
    if (field.ignore_above) props.ignore_above = field.ignore_above;
    props.type = 'wildcard';
    applyMultiFields(props, field);
    return props;
  },
  dynamicMapping(field) {
    const props = {
      ...getDefaultProperties(field),
      ...buildTextExtras(field, { isDynamic: true }),
      type: 'wildcard',
    };
    applyMultiFields(props, field);
    return {
      properties: props,
      matchingType: field.object_type_mapping_type ?? 'string',
    };
  },
};

/**
 * Handles all numeric types. esType is what gets written to the mapping;
 * defaultMatchingType is the ES match_mapping_type for dynamic templates.
 * 'integer' is handled by passing esType='long' since ES maps integers as long.
 */
const numericType = (esType: string, defaultMatchingType: string): FieldTypeHandler => ({
  staticMapping(field, builder) {
    const props = { ...getDefaultProperties(field), type: esType };
    applyTimeSeriesMetric(props, field, builder);
    return props;
  },
  dynamicMapping(field, builder) {
    const props = { ...getDefaultProperties(field), type: esType };
    applyTimeSeriesMetric(props, field, builder);
    applyTimeSeriesDimension(props, field, builder);
    return {
      properties: props,
      matchingType: field.object_type_mapping_type ?? defaultMatchingType,
    };
  },
  multiFieldMapping() {
    return { type: esType };
  },
  runtimeMapping() {
    return { type: esType };
  },
});

const booleanType: FieldTypeHandler = {
  staticMapping(field, builder) {
    const props = { ...getDefaultProperties(field), type: 'boolean' };
    applyTimeSeriesMetric(props, field, builder);
    return props;
  },
  dynamicMapping(field, builder) {
    const props = { ...getDefaultProperties(field), type: 'boolean' };
    applyTimeSeriesMetric(props, field, builder);
    applyTimeSeriesDimension(props, field, builder);
    return {
      properties: props,
      matchingType: field.object_type_mapping_type ?? 'boolean',
    };
  },
  runtimeMapping() {
    return { type: 'boolean' };
  },
};

const dateType: FieldTypeHandler = {
  staticMapping(field) {
    return { ...getDefaultProperties(field), ...buildDateMapping(field), type: 'date' };
  },
  runtimeMapping(field) {
    return { ...buildDateMapping(field), type: 'date' };
  },
};

/**
 * Generic type with no time-series, multi-field, or static/dynamic divergence:
 * the same properties are emitted in both static and dynamic mappings.
 */
const simpleType = (
  buildProps: (field: Field) => Properties,
  defaultMatchingType: string
): FieldTypeHandler => ({
  staticMapping(field) {
    return buildProps(field);
  },
  dynamicMapping(field) {
    return {
      properties: buildProps(field),
      matchingType: field.object_type_mapping_type ?? defaultMatchingType,
    };
  },
});

const aggregateMetricDoubleType: FieldTypeHandler = {
  staticMapping(field) {
    return {
      ...getDefaultProperties(field),
      metrics: field.metrics,
      default_metric: field.default_metric,
      type: 'aggregate_metric_double',
    };
  },
  dynamicMapping(field) {
    return {
      properties: {
        ...getDefaultProperties(field),
        type: 'aggregate_metric_double',
        metrics: field.metrics,
        default_metric: field.default_metric,
      },
      matchingType: field.object_type_mapping_type ?? '*',
    };
  },
};

const flattenedType: FieldTypeHandler = {
  staticMapping(field) {
    const props = { ...getDefaultProperties(field), type: 'flattened' };
    if (field.ignore_above) props.ignore_above = field.ignore_above;
    return props;
  },
  // TODO: static mapping copies `field.ignore_above`, dynamic mapping silently
  // drops it. Confirm whether this divergence is intentional legacy behavior
  // before unifying the two builders.
  dynamicMapping(field) {
    return {
      properties: { ...getDefaultProperties(field), type: 'flattened' },
      matchingType: field.object_type_mapping_type ?? 'object',
    };
  },
};

const constantKeywordType: FieldTypeHandler = {
  staticMapping(field) {
    const props: Properties = { ...getDefaultProperties(field), type: 'constant_keyword' };
    if (field.value) props.value = field.value;
    return props;
  },
};

const aliasType: FieldTypeHandler = {
  // Assumes alias fields were validated in an earlier step.
  // Adding a path to a field that doesn't exist would result in an error when the template is added to ES.
  staticMapping(field) {
    return { ...getDefaultProperties(field), type: 'alias', path: field.path };
  },
};

const arrayType: FieldTypeHandler = {
  // Assumes array fields were validated in an earlier step.
  // Adding an array field with no object_type would result in an error when the template is added to ES.
  staticMapping(field) {
    const props = getDefaultProperties(field);
    if (field.object_type) props.type = field.object_type;
    return props;
  },
};

const objectType: FieldTypeHandler = {
  staticMapping(field) {
    return { ...getDefaultProperties(field), ...generateDynamicAndEnabled(field), type: 'object' };
  },
};

const nestedType: FieldTypeHandler = {
  staticMapping(field, builder, context) {
    const props: Properties = { ...generateNestedProps(field), type: 'nested' };
    if (field.fields) {
      props.properties = builder.build(
        field.fields,
        fieldPath(context.groupFieldName, field.name)
      ).properties;
    }
    return props;
  },
};

const groupType: FieldTypeHandler = {
  /**
   * Returns a GroupMappingResult so the walker can propagate the outer
   * hasDynamicTemplateMappings flag correctly (only when the group itself
   * has no static children, i.e. only dynamic template mappings).
   * Returns undefined when the group has no mappings to emit.
   */
  mapGroup(field, builder, context) {
    const mappings = builder.build(field.fields!, fieldPath(context.groupFieldName, field.name));

    if (mappings.hasNonDynamicTemplateMappings) {
      const fieldProps: Properties = {
        properties: Object.keys(mappings.properties).length > 0 ? mappings.properties : undefined,
        ...generateDynamicAndEnabled(field),
      };
      if (mappings.hasDynamicTemplateMappings) {
        fieldProps.type = 'object';
        fieldProps.dynamic = true;
      }
      if (mappings.subobjects !== undefined) fieldProps.subobjects = mappings.subobjects;
      return { fieldProps, onlyDynamicTemplateMappings: false };
    } else if (mappings.hasDynamicTemplateMappings) {
      return {
        fieldProps: dynamicObjectParentProps(mappings.subobjects),
        onlyDynamicTemplateMappings: true,
      };
    }

    return undefined;
  },
};

// ---------------------------------------------------------------------------
// Registry: maps every supported field type string to its handler
// ---------------------------------------------------------------------------

export const fieldTypeRegistry: Readonly<Record<string, FieldTypeHandler>> = {
  keyword: keywordType,
  text: textLikeType('text'),
  match_only_text: textLikeType('match_only_text'),
  wildcard: wildcardType,
  long: numericType('long', 'long'),
  integer: numericType('long', 'long'), // integer maps to long
  short: numericType('short', 'long'),
  byte: numericType('byte', 'long'),
  unsigned_long: numericType('unsigned_long', 'long'),
  double: numericType('double', 'double'),
  float: numericType('float', 'double'),
  half_float: numericType('half_float', 'double'),
  boolean: booleanType,
  date: dateType,
  ip: simpleType((field) => ({ ...getDefaultProperties(field), type: 'ip' }), 'string'),
  histogram: simpleType(histogram, '*'),
  scaled_float: simpleType(scaledFloat, '*'),
  aggregate_metric_double: aggregateMetricDoubleType,
  flattened: flattenedType,
  constant_keyword: constantKeywordType,
  alias: aliasType,
  array: arrayType,
  object: objectType,
  nested: nestedType,
  'group-nested': nestedType, // treated identically to nested
  group: groupType,
};

// ---------------------------------------------------------------------------
// Multi-field helpers
//
// Defined at the bottom because generateMultiFields references the registry
// above. Handler methods reference applyMultiFields, but only at call time
// (lazily), so the forward reference is safe.
// ---------------------------------------------------------------------------

const applyMultiFields = (props: Properties, field: Field): void => {
  if (field.multi_fields) props.fields = generateMultiFields(field.multi_fields);
};

export const generateMultiFields = (fields: Fields): MultiFields => {
  const multiFields: MultiFields = {};
  fields.forEach((f: Field) => {
    const handler = f.type ? fieldTypeRegistry[f.type] : undefined;
    const mapped = handler?.multiFieldMapping?.(f);
    if (mapped) multiFields[f.name] = mapped;
  });
  return multiFields;
};
