/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

import type { Field, Fields } from '../../fields/field';

import { getDefaultProperties, histogram, keyword, scaledFloat } from './mappings';
import type { MappingsBuilder } from './mappings_builder';
import type {
  WalkContext,
  DynamicMappingResult,
  Properties,
  MultiFields,
} from './mappings_builder';

export type { DynamicMappingResult, Properties, MultiFields };

const DEFAULT_IGNORE_ABOVE = 1024;

// ---------------------------------------------------------------------------
// Shared helpers used by multiple type classes
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

// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------

/**
 * Base class for all ES field types. Default implementations are no-ops so
 * subclasses only override the contexts that apply to them, preserving
 * current silent-skip behavior for unsupported combinations.
 */
export abstract class FieldType {
  staticMapping(
    _field: Field,
    _builder: MappingsBuilder,
    _context: WalkContext
  ): Properties | undefined {
    return undefined;
  }

  dynamicMapping(_field: Field, _builder: MappingsBuilder): DynamicMappingResult | undefined {
    return undefined;
  }

  multiFieldMapping(_field: Field): Properties | undefined {
    return undefined;
  }

  runtimeMapping(_field: Field): Properties | undefined {
    return undefined;
  }

  protected applyTimeSeriesMetric(props: Properties, field: Field, builder: MappingsBuilder) {
    if (builder.isIndexModeTimeSeries && field.metric_type) {
      props.time_series_metric = field.metric_type;
    }
  }

  protected applyTimeSeriesDimension(props: Properties, field: Field, builder: MappingsBuilder) {
    if (builder.isIndexModeTimeSeries && field.dimension) {
      props.time_series_dimension = field.dimension;
    }
  }
}

// ---------------------------------------------------------------------------
// Per-type subclasses
// ---------------------------------------------------------------------------

class KeywordType extends FieldType {
  staticMapping(field: Field): Properties {
    const props = keyword(field);
    if (field.multi_fields) props.fields = generateMultiFields(field.multi_fields);
    return props;
  }

  dynamicMapping(field: Field, builder: MappingsBuilder): DynamicMappingResult {
    const props = keyword(field, true);
    if (field.multi_fields) props.fields = generateMultiFields(field.multi_fields);
    this.applyTimeSeriesDimension(props, field, builder);
    return {
      properties: props,
      matchingType: field.object_type_mapping_type ?? 'string',
    };
  }

  multiFieldMapping(field: Field): Properties {
    return keyword(field);
  }

  runtimeMapping(_field: Field): Properties {
    return { type: 'keyword' };
  }
}

class TextLikeType extends FieldType {
  constructor(protected readonly esType: string) {
    super();
  }

  staticMapping(field: Field): Properties {
    const props = {
      ...getDefaultProperties(field),
      ...buildTextExtras(field, { isDynamic: false }),
      type: this.esType,
    };
    if (field.multi_fields) props.fields = generateMultiFields(field.multi_fields);
    return props;
  }

  dynamicMapping(field: Field): DynamicMappingResult {
    const props = {
      ...getDefaultProperties(field),
      ...buildTextExtras(field, { isDynamic: true }),
      type: this.esType,
    };
    if (field.multi_fields) props.fields = generateMultiFields(field.multi_fields);
    return {
      properties: props,
      matchingType: field.object_type_mapping_type ?? 'string',
    };
  }

  multiFieldMapping(field: Field): Properties {
    return { ...buildTextExtras(field, { isDynamic: false }), type: this.esType };
  }
}

class WildcardType extends FieldType {
  staticMapping(field: Field): Properties {
    const props: Properties = {
      ...getDefaultProperties(field),
      ignore_above: DEFAULT_IGNORE_ABOVE,
    };
    if (field.null_value) props.null_value = field.null_value;
    if (field.ignore_above) props.ignore_above = field.ignore_above;
    props.type = 'wildcard';
    if (field.multi_fields) props.fields = generateMultiFields(field.multi_fields);
    return props;
  }

  dynamicMapping(field: Field): DynamicMappingResult {
    const props = {
      ...getDefaultProperties(field),
      ...buildTextExtras(field, { isDynamic: true }),
      type: 'wildcard',
    };
    if (field.multi_fields) props.fields = generateMultiFields(field.multi_fields);
    return {
      properties: props,
      matchingType: field.object_type_mapping_type ?? 'string',
    };
  }
}

/**
 * Handles all numeric types. The esType is what gets written to the mapping;
 * the defaultMatchingType is the ES match_mapping_type for dynamic templates.
 * 'integer' is handled by passing esType='long' since ES maps integers as long.
 */
class NumericType extends FieldType {
  constructor(private readonly esType: string, private readonly defaultMatchingType: string) {
    super();
  }

  staticMapping(field: Field, builder: MappingsBuilder): Properties {
    const props = { ...getDefaultProperties(field), type: this.esType };
    this.applyTimeSeriesMetric(props, field, builder);
    return props;
  }

  dynamicMapping(field: Field, builder: MappingsBuilder): DynamicMappingResult {
    const props = { ...getDefaultProperties(field), type: this.esType };
    this.applyTimeSeriesMetric(props, field, builder);
    this.applyTimeSeriesDimension(props, field, builder);
    return {
      properties: props,
      matchingType: field.object_type_mapping_type ?? this.defaultMatchingType,
    };
  }

  multiFieldMapping(_field: Field): Properties {
    return { type: this.esType };
  }

  runtimeMapping(_field: Field): Properties {
    return { type: this.esType };
  }
}

class BooleanType extends FieldType {
  staticMapping(field: Field, builder: MappingsBuilder): Properties {
    const props = { ...getDefaultProperties(field), type: 'boolean' };
    this.applyTimeSeriesMetric(props, field, builder);
    return props;
  }

  dynamicMapping(field: Field, builder: MappingsBuilder): DynamicMappingResult {
    const props = { ...getDefaultProperties(field), type: 'boolean' };
    this.applyTimeSeriesMetric(props, field, builder);
    this.applyTimeSeriesDimension(props, field, builder);
    return {
      properties: props,
      matchingType: field.object_type_mapping_type ?? 'boolean',
    };
  }

  runtimeMapping(_field: Field): Properties {
    return { type: 'boolean' };
  }
}

class DateType extends FieldType {
  staticMapping(field: Field): Properties {
    return { ...getDefaultProperties(field), ...buildDateMapping(field), type: 'date' };
  }

  runtimeMapping(field: Field): Properties {
    return { ...buildDateMapping(field), type: 'date' };
  }
}

class IpType extends FieldType {
  staticMapping(field: Field): Properties {
    return { ...getDefaultProperties(field), type: 'ip' };
  }

  dynamicMapping(field: Field): DynamicMappingResult {
    return {
      properties: { ...getDefaultProperties(field), type: 'ip' },
      matchingType: field.object_type_mapping_type ?? 'string',
    };
  }
}

class HistogramType extends FieldType {
  staticMapping(field: Field): Properties {
    return histogram(field);
  }

  dynamicMapping(field: Field): DynamicMappingResult {
    return {
      properties: histogram(field),
      matchingType: field.object_type_mapping_type ?? '*',
    };
  }
}

class ScaledFloatType extends FieldType {
  staticMapping(field: Field): Properties {
    return scaledFloat(field);
  }

  dynamicMapping(field: Field): DynamicMappingResult {
    return {
      properties: scaledFloat(field),
      matchingType: field.object_type_mapping_type ?? '*',
    };
  }
}

class AggregateMetricDoubleType extends FieldType {
  staticMapping(field: Field): Properties {
    return {
      ...getDefaultProperties(field),
      metrics: field.metrics,
      default_metric: field.default_metric,
      type: 'aggregate_metric_double',
    };
  }

  dynamicMapping(field: Field): DynamicMappingResult {
    return {
      properties: {
        ...getDefaultProperties(field),
        type: 'aggregate_metric_double',
        metrics: field.metrics,
        default_metric: field.default_metric,
      },
      matchingType: field.object_type_mapping_type ?? '*',
    };
  }
}

class FlattenedType extends FieldType {
  staticMapping(field: Field): Properties {
    const props = { ...getDefaultProperties(field), type: 'flattened' };
    if (field.ignore_above) props.ignore_above = field.ignore_above;
    return props;
  }

  dynamicMapping(field: Field): DynamicMappingResult {
    return {
      properties: { ...getDefaultProperties(field), type: 'flattened' },
      matchingType: field.object_type_mapping_type ?? 'object',
    };
  }
}

class ConstantKeywordType extends FieldType {
  staticMapping(field: Field): Properties {
    const props: Properties = { ...getDefaultProperties(field), type: 'constant_keyword' };
    if (field.value) props.value = field.value;
    return props;
  }
}

class AliasType extends FieldType {
  staticMapping(field: Field): Properties {
    // Assumes alias fields were validated in an earlier step.
    // Adding a path to a field that doesn't exist would result in an error when the template is added to ES.
    return { ...getDefaultProperties(field), type: 'alias', path: field.path };
  }
}

class ArrayType extends FieldType {
  staticMapping(field: Field): Properties {
    // Assumes array fields were validated in an earlier step.
    // Adding an array field with no object_type would result in an error when the template is added to ES.
    const props = getDefaultProperties(field);
    if (field.object_type) props.type = field.object_type;
    return props;
  }
}

class ObjectType extends FieldType {
  staticMapping(field: Field): Properties {
    return { ...getDefaultProperties(field), ...generateDynamicAndEnabled(field), type: 'object' };
  }
}

class NestedType extends FieldType {
  staticMapping(field: Field, builder: MappingsBuilder, context: WalkContext): Properties {
    const props: Properties = { ...generateNestedProps(field), type: 'nested' };
    if (field.fields) {
      props.properties = builder.build(
        field.fields,
        fieldPath(context.groupFieldName, field.name)
      ).properties;
    }
    return props;
  }
}

export interface GroupMappingResult {
  fieldProps: Properties;
  /** True when this group's result only comes from dynamic template children, no static props. */
  onlyDynamicTemplateMappings: boolean;
}

export class GroupType extends FieldType {
  /**
   * Returns a GroupMappingResult so the walker can propagate the outer
   * hasDynamicTemplateMappings flag correctly (only when the group itself
   * has no static children, i.e. only dynamic template mappings).
   * Returns undefined when the group has no mappings to emit.
   */
  mapGroup(
    field: Field,
    builder: MappingsBuilder,
    context: WalkContext
  ): GroupMappingResult | undefined {
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
      const fieldProps: Properties = { type: 'object', dynamic: true };
      if (mappings.subobjects !== undefined) fieldProps.subobjects = mappings.subobjects;
      return { fieldProps, onlyDynamicTemplateMappings: true };
    }

    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Registry: maps every supported field type string to its handler instance
// ---------------------------------------------------------------------------

export const fieldTypeRegistry: Readonly<Record<string, FieldType>> = {
  keyword: new KeywordType(),
  text: new TextLikeType('text'),
  match_only_text: new TextLikeType('match_only_text'),
  wildcard: new WildcardType(),
  long: new NumericType('long', 'long'),
  integer: new NumericType('long', 'long'), // integer maps to long
  short: new NumericType('short', 'long'),
  byte: new NumericType('byte', 'long'),
  unsigned_long: new NumericType('unsigned_long', 'long'),
  double: new NumericType('double', 'double'),
  float: new NumericType('float', 'double'),
  half_float: new NumericType('half_float', 'double'),
  boolean: new BooleanType(),
  date: new DateType(),
  ip: new IpType(),
  histogram: new HistogramType(),
  scaled_float: new ScaledFloatType(),
  aggregate_metric_double: new AggregateMetricDoubleType(),
  flattened: new FlattenedType(),
  constant_keyword: new ConstantKeywordType(),
  alias: new AliasType(),
  array: new ArrayType(),
  object: new ObjectType(),
  nested: new NestedType(),
  'group-nested': new NestedType(), // treated identically to nested
  group: new GroupType(),
};

// ---------------------------------------------------------------------------
// Multi-field helper (used by type subclasses and MappingsBuilder)
// ---------------------------------------------------------------------------

export const generateMultiFields = (fields: Fields): MultiFields => {
  const multiFields: MultiFields = {};
  if (fields) {
    fields.forEach((f: Field) => {
      const handler = f.type ? fieldTypeRegistry[f.type] : undefined;
      const mapped = handler?.multiFieldMapping(f);
      if (mapped) multiFields[f.name] = mapped;
    });
  }
  return multiFields;
};
