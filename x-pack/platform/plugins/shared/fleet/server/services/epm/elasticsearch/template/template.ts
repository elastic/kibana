/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// The field-type class hierarchy (FieldType and its subclasses) lives in this file for now.
// Moving each type to its own module is a follow-up task.
/* eslint-disable max-classes-per-file */
import deepEqual from 'fast-deep-equal';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  IndicesIndexSettings,
  MappingDynamicTemplate,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';

import pMap from 'p-map';
import { isResponseError } from '@kbn/es-errors';

import {
  FLEET_EVENT_INGESTED_COMPONENT_TEMPLATE_NAME,
  OTEL_LOGS_COMPONENT_TEMPLATES,
  OTEL_METRICS_COMPONENT_TEMPLATES,
  OTEL_TRACES_COMPONENT_TEMPLATES,
  STACK_COMPONENT_TEMPLATE_LOGS_MAPPINGS,
} from '../../../../constants/fleet_es_assets';
import { MAX_CONCURRENT_DATASTREAM_OPERATIONS } from '../../../../constants';

import type { Field, Fields } from '../../fields/field';
import type {
  RegistryDataStream,
  IndexTemplateEntry,
  IndexTemplate,
  IndexTemplateMappings,
  RegistryElasticsearch,
} from '../../../../types';
import { appContextService } from '../../..';
import { getRegistryDataStreamAssetBaseName } from '../../../../../common/services';
import {
  STACK_COMPONENT_TEMPLATE_ECS_MAPPINGS,
  FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME,
  FLEET_AGENT_ID_VERIFY_COMPONENT_TEMPLATE_NAME,
  STACK_COMPONENT_TEMPLATE_LOGS_SETTINGS,
  STACK_COMPONENT_TEMPLATE_METRICS_SETTINGS,
  STACK_COMPONENT_TEMPLATE_METRICS_TSDB_SETTINGS,
} from '../../../../constants';
import { getESAssetMetadata } from '../meta';
import { retryTransientEsErrors } from '../retry';
import { PackageESError, PackageInvalidArchiveError } from '../../../../errors';

import { getDefaultProperties, histogram, keyword, scaledFloat } from './mappings';
import { isUserSettingsTemplate, fillConstantKeywordValues } from './utils';

interface Properties {
  [key: string]: any;
}

interface MultiFields {
  [key: string]: object;
}

interface RuntimeFields {
  [key: string]: any;
}

export interface IndexTemplateMapping {
  [key: string]: any;
}
export interface CurrentDataStream {
  dataStreamName: string;
  replicated: boolean;
  indexTemplate: IndexTemplate;
  currentWriteIndex: string;
}

const DEFAULT_IGNORE_ABOVE = 1024;

// see discussion in https://github.com/elastic/kibana/issues/88307
const DEFAULT_TEMPLATE_PRIORITY = 200;
const DATASET_IS_PREFIX_TEMPLATE_PRIORITY = 150;

// Namespace-scoped templates get a higher priority so ES picks them over
// the base template for data streams belonging to that namespace.
export const NAMESPACE_TEMPLATE_PRIORITY_BOOST = 50;

const META_PROP_KEYS = ['metric_type', 'unit'];

// ---------------------------------------------------------------------------
// Field-type class hierarchy
// ---------------------------------------------------------------------------

interface DynamicMappingResult {
  properties: Properties;
  matchingType: string;
}

/**
 * Base class for all ES field types. Default implementations are no-ops so
 * subclasses only override the contexts that apply to them, preserving
 * current silent-skip behavior for unsupported combinations.
 */
abstract class FieldType {
  staticMapping(_field: Field, _builder: MappingsBuilder): Properties | undefined {
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
// Shared helpers used by multiple type classes
// ---------------------------------------------------------------------------

const fieldPath = (groupFieldName: string | undefined, name: string) =>
  groupFieldName ? `${groupFieldName}.${name}` : name;

const dynamicPathMatch = (path: string) => (path.includes('*') ? path : `${path}.*`);

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

const generateDynamicAndEnabled = (field: Field): Properties => {
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
  staticMapping(field: Field, builder: MappingsBuilder): Properties {
    const props: Properties = { ...generateNestedProps(field), type: 'nested' };
    if (field.fields) {
      props.properties = builder.build(
        field.fields,
        fieldPath(builder.groupFieldName, field.name)
      ).properties;
    }
    return props;
  }
}

interface GroupMappingResult {
  fieldProps: Properties;
  /** True when this group's result only comes from dynamic template children, no static props. */
  onlyDynamicTemplateMappings: boolean;
}

class GroupType extends FieldType {
  /**
   * Returns a GroupMappingResult so the walker can propagate the outer
   * hasDynamicTemplateMappings flag correctly (only when the group itself
   * has no static children, i.e. only dynamic template mappings).
   * Returns undefined when the group has no mappings to emit.
   */
  mapGroup(field: Field, builder: MappingsBuilder): GroupMappingResult | undefined {
    const mappings = builder.build(field.fields!, fieldPath(builder.groupFieldName, field.name));

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

const fieldTypeRegistry: Readonly<Record<string, FieldType>> = {
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

/**
 * getTemplate retrieves the default template but overwrites the index pattern with the given value.
 *
 * @param indexPattern String with the index pattern
 */
export function getTemplate({
  templateIndexPattern,
  packageName,
  composedOfTemplates,
  templatePriority,
  hidden,
  registryElasticsearch,
  isIndexModeTimeSeries,
  type,
  isOtelInputType,
}: {
  templateIndexPattern: string;
  packageName: string;
  composedOfTemplates: string[];
  templatePriority: number;
  type: string;
  hidden?: boolean;
  registryElasticsearch?: RegistryElasticsearch | undefined;
  isIndexModeTimeSeries?: boolean;
  isOtelInputType?: boolean;
}): IndexTemplate {
  const template = getBaseTemplate({
    templateIndexPattern,
    packageName,
    composedOfTemplates,
    templatePriority,
    registryElasticsearch,
    hidden,
    isIndexModeTimeSeries,
  });
  if (template.template.settings.index.final_pipeline) {
    throw new PackageInvalidArchiveError(
      `Error template for ${templateIndexPattern} contains a final_pipeline`
    );
  }

  const esBaseComponents = getBaseEsComponents(type, !!isIndexModeTimeSeries, isOtelInputType);
  const config = appContextService.getConfig();

  template.composed_of = [
    ...esBaseComponents,
    ...(template.composed_of || []),
    ...(isOtelInputType ? [] : [STACK_COMPONENT_TEMPLATE_ECS_MAPPINGS]),
    FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME,
    ...(config?.agentIdVerificationEnabled ? [FLEET_AGENT_ID_VERIFY_COMPONENT_TEMPLATE_NAME] : []),
    ...(!config?.agentIdVerificationEnabled && config?.eventIngestedEnabled
      ? [FLEET_EVENT_INGESTED_COMPONENT_TEMPLATE_NAME]
      : []),
  ];

  template.ignore_missing_component_templates = template.composed_of.filter(isUserSettingsTemplate);
  return template;
}

const getBaseEsComponents = (
  type: string,
  isIndexModeTimeSeries: boolean,
  isOTelInputType?: boolean
): string[] => {
  if (isOTelInputType) {
    return getOtelBaseComponents(type);
  }

  if (type === 'metrics') {
    if (isIndexModeTimeSeries) {
      return [STACK_COMPONENT_TEMPLATE_METRICS_TSDB_SETTINGS];
    }

    return [STACK_COMPONENT_TEMPLATE_METRICS_SETTINGS];
  } else if (type === 'logs') {
    return [STACK_COMPONENT_TEMPLATE_LOGS_MAPPINGS, STACK_COMPONENT_TEMPLATE_LOGS_SETTINGS];
  }

  return [];
};

const getOtelBaseComponents = (type: string): string[] => {
  if (type === 'metrics') {
    return OTEL_METRICS_COMPONENT_TEMPLATES;
  } else if (type === 'logs') {
    return OTEL_LOGS_COMPONENT_TEMPLATES;
  } else if (type === 'traces') {
    return OTEL_TRACES_COMPONENT_TEMPLATES;
  }
  return [];
};

interface WalkResult {
  properties: IndexTemplateMappings['properties'];
  hasNonDynamicTemplateMappings: boolean;
  hasDynamicTemplateMappings: boolean;
  subobjects?: boolean;
}

class MappingsBuilder {
  readonly isIndexModeTimeSeries: boolean;
  groupFieldName: string | undefined;

  private readonly dynamicTemplates: Array<Record<string, Properties>> = [];
  private readonly dynamicTemplateNames: Record<string, number> = {};
  private readonly runtimeFields: RuntimeFields = {};

  constructor(isIndexModeTimeSeries: boolean) {
    this.isIndexModeTimeSeries = isIndexModeTimeSeries;
  }

  /**
   * Walk a list of fields and accumulate their mappings into a WalkResult.
   * groupFieldName scopes the dynamic template paths for nested/group fields.
   */
  build(fields: Field[], groupFieldName?: string): WalkResult {
    const outerGroupFieldName = this.groupFieldName;
    this.groupFieldName = groupFieldName;

    let hasNonDynamicTemplateMappings = false;
    let hasDynamicTemplateMappings = false;
    let subobjects: boolean | undefined;
    const props: Properties = {};

    const addParentObjectAsStaticProperty = (field: Field) => {
      // Don't add intermediate objects for wildcard names, as it will
      // be added for its parent object.
      if (field.name.includes('*')) return;
      props[field.name] = {
        type: 'object',
        dynamic: true,
        ...(field.subobjects !== undefined && { subobjects: field.subobjects }),
      };
      hasNonDynamicTemplateMappings = true;
    };

    const addDynamicMappingWithIntermediateObjects = (
      path: string,
      pathMatch: string,
      matchingType: string,
      dynProperties: Properties,
      runtimeProperties?: Properties
    ) => {
      this.addDynamicTemplate(path, pathMatch, matchingType, dynProperties, runtimeProperties);
      hasDynamicTemplateMappings = true;

      // Add dynamic intermediate objects.
      const parts = pathMatch.split('.');
      for (let i = parts.length - 1; i > 0; i--) {
        const name = parts.slice(0, i).join('.');
        if (!name.includes('*')) continue;
        this.addDynamicTemplate(name, name, 'object', { type: 'object', dynamic: true });
      }
    };

    const addObjectAsDynamicMapping = (field: Field) => {
      const path = fieldPath(this.groupFieldName, field.name);
      const pMatch = dynamicPathMatch(path);
      const objectType = field.object_type!;

      if (objectType === 'group') {
        if (!field.fields) return;
        const subFields = field.fields.map((subField) => ({
          ...subField,
          type: 'object',
          object_type: subField.object_type ?? subField.type,
        }));
        const mappings = this.build(subFields, fieldPath(this.groupFieldName, field.name));
        if (mappings.hasDynamicTemplateMappings) hasDynamicTemplateMappings = true;
        return;
      }

      const handler = fieldTypeRegistry[objectType];
      const result = handler?.dynamicMapping({ ...field, type: objectType }, this);

      if (!result) {
        // Preserve original behavior: unsupported or unknown object_type always throws.
        throw new PackageInvalidArchiveError(
          `No dynamic mapping generated for field ${path} of type ${objectType}`
        );
      }

      // When a wildcard field specifies the subobjects setting,
      // the parent intermediate object should set the subobjects setting.
      // For example, if a wildcard field `foo.*` has subobjects,
      // we should set subobjects on the intermediate object `foo`.
      if (field.subobjects !== undefined && path.includes('*')) {
        subobjects = field.subobjects;
      }

      addDynamicMappingWithIntermediateObjects(
        path,
        pMatch,
        result.matchingType,
        result.properties
      );

      // Add the parent object as static property, needed for index templates not using `"dynamic": true`.
      addParentObjectAsStaticProperty(field);
    };

    // TODO: this can happen when the fields property in fields.yml is present but empty.
    // Maybe validation should be moved to fields/field.ts.
    if (fields) {
      fields.forEach((field) => {
        // If type is not defined, assume keyword
        const type = field.type || 'keyword';

        if (field.runtime !== undefined) {
          const path = fieldPath(this.groupFieldName, field.name);

          if (type === 'object' && field.object_type) {
            // Runtime field that is also a dynamic template (e.g. labels.* with runtime: true).
            const pMatch = dynamicPathMatch(path);
            const objectType = field.object_type;

            const handler = fieldTypeRegistry[objectType];
            const dynResult = handler?.dynamicMapping({ ...field, type: objectType }, this);
            const runtimeProps = handler?.runtimeMapping({ ...field, type: objectType });

            if (dynResult && runtimeProps) {
              addDynamicMappingWithIntermediateObjects(
                path,
                pMatch,
                dynResult.matchingType,
                dynResult.properties,
                runtimeProps
              );
              addParentObjectAsStaticProperty(field);
            }
            return;
          }

          const handler = fieldTypeRegistry[type];
          const runtimeProps = handler?.runtimeMapping(field) ?? { type };
          const runtimeFieldProps = {
            ...getDefaultProperties(field),
            ...runtimeProps,
          };
          if (typeof field.runtime === 'string') {
            runtimeFieldProps.script = { source: field.runtime.trim() };
          }
          this.addRuntimeField(path, runtimeFieldProps);
          return;
        }

        if (type === 'object' && field.object_type) {
          addObjectAsDynamicMapping(field);
          return;
        }

        const handler = fieldTypeRegistry[type];
        let fieldProps: Properties;

        if (type === 'group') {
          const groupHandler = handler as GroupType;
          const groupResult = groupHandler.mapGroup(field, this);
          if (groupResult === undefined) return;

          fieldProps = groupResult.fieldProps;

          // Only propagate hasDynamicTemplateMappings upward when the group produced
          // no static properties — matching original behavior.
          if (groupResult.onlyDynamicTemplateMappings) hasDynamicTemplateMappings = true;

          // A group that also has an object_type was merged with an object during deduplication.
          // Generate the dynamic mapping for the object side too, and mark the group as dynamic.
          if (field.object_type) {
            addObjectAsDynamicMapping(field);
            hasDynamicTemplateMappings = true;
            fieldProps.type = 'object';
            fieldProps.dynamic = true;
          }
        } else if (handler) {
          const mapped = handler.staticMapping(field, this);
          if (mapped === undefined) return;
          fieldProps = mapped;
        } else {
          // Unknown type: pass through as-is (legacy behaviour).
          fieldProps = { ...getDefaultProperties(field), type };
        }

        const fieldHasMetaProps = META_PROP_KEYS.some((key) => key in field);
        if (fieldHasMetaProps && type !== 'group' && type !== 'group-nested') {
          const meta: Properties = {};
          if ('unit' in field) Reflect.set(meta, 'unit', field.unit);
          fieldProps.meta = meta;
        }

        if ('metric_type' in field && this.isIndexModeTimeSeries) {
          fieldProps.time_series_metric = field.metric_type;
        }
        if (field.dimension && this.isIndexModeTimeSeries) {
          fieldProps.time_series_dimension = field.dimension;
        }

        if (field.subobjects !== undefined) {
          fieldProps.subobjects = field.subobjects;
        }

        // Even if we don't add the property because it has a wildcard, notify
        // the parent that there is some kind of property, so the intermediate object
        // is still created.
        // This is done for legacy packages that include ambiguous mappings with objects
        // without object type. This is not allowed starting on Package Spec v3.
        hasNonDynamicTemplateMappings = true;

        // Avoid including maps with wildcards, they have generated dynamic mappings.
        if (field.name.includes('*')) {
          hasDynamicTemplateMappings = true;
          return;
        }

        props[field.name] = fieldProps;
      });
    }

    this.groupFieldName = outerGroupFieldName;

    return {
      properties: props,
      hasNonDynamicTemplateMappings,
      hasDynamicTemplateMappings,
      subobjects,
    };
  }

  private addDynamicTemplate(
    path: string,
    pathMatch: string,
    matchingType: string,
    properties: Properties,
    runtimeProperties?: Properties
  ) {
    const name = path;
    if (name in this.dynamicTemplateNames) {
      if (name.includes('*') && properties?.type === 'object') {
        // This is a conflicting intermediate object, use the last one so
        // more specific templates are chosen before.
        const index = this.dynamicTemplateNames[name];
        delete this.dynamicTemplateNames[name];
        this.dynamicTemplates.splice(index, 1);
      } else {
        return;
      }
    }

    const dynamicTemplate: Properties = {};
    if (runtimeProperties !== undefined) {
      dynamicTemplate.runtime = runtimeProperties;
    } else {
      dynamicTemplate.mapping = properties;
    }

    if (matchingType) dynamicTemplate.match_mapping_type = matchingType;
    if (pathMatch) dynamicTemplate.path_match = pathMatch;

    const size = this.dynamicTemplates.push({ [name]: dynamicTemplate });
    this.dynamicTemplateNames[name] = size - 1;
  }

  private addRuntimeField(path: string, properties: Properties) {
    this.runtimeFields[path] = properties;
  }

  toIndexTemplateMappings(
    topLevelProperties: IndexTemplateMappings['properties']
  ): IndexTemplateMappings {
    const result: IndexTemplateMappings = { properties: topLevelProperties };
    if (this.dynamicTemplates.length > 0) result.dynamic_templates = this.dynamicTemplates;
    if (Object.keys(this.runtimeFields).length > 0) result.runtime = this.runtimeFields;
    return result;
  }
}

/**
 * Generate mapping takes the given nested fields array and creates the Elasticsearch
 * mapping properties out of it.
 *
 * This assumes that all fields with dotted.names have been expanded in a previous step.
 */
export function generateMappings(
  fields: Field[],
  isIndexModeTimeSeries = false
): IndexTemplateMappings {
  const builder = new MappingsBuilder(isIndexModeTimeSeries);
  const { properties } = builder.build(fields);
  return builder.toIndexTemplateMappings(properties);
}

function generateMultiFields(fields: Fields): MultiFields {
  const multiFields: MultiFields = {};
  if (fields) {
    fields.forEach((f: Field) => {
      const handler = f.type ? fieldTypeRegistry[f.type] : undefined;
      const mapped = handler?.multiFieldMapping(f);
      if (mapped) multiFields[f.name] = mapped;
    });
  }
  return multiFields;
}

/**
 * Generates the template name out of the given information
 */
export function generateTemplateName(dataStream: RegistryDataStream): string {
  return getRegistryDataStreamAssetBaseName(dataStream);
}

/**
 * Given a data stream name, return the indexTemplate name
 */
async function getIndexTemplate(
  esClient: ElasticsearchClient,
  dataStreamName: string
): Promise<string> {
  const dataStream = await esClient.indices.getDataStream({
    name: dataStreamName,
    expand_wildcards: ['open', 'hidden'],
  });
  return dataStream.data_streams[0].template;
}

const buildIndexPattern = (baseName: string, isPrefix: boolean, tail: string): string =>
  isPrefix ? `${baseName}.*-${tail}` : `${baseName}-${tail}`;

export function generateTemplateIndexPattern(
  dataStream: RegistryDataStream,
  isOtelInputType?: boolean
): string {
  // See also https://github.com/elastic/package-spec/pull/102
  return buildIndexPattern(
    getRegistryDataStreamAssetBaseName(dataStream, isOtelInputType),
    !!dataStream.dataset_is_prefix,
    '*'
  );
}

// Template priorities are discussed in https://github.com/elastic/kibana/issues/88307
// See also https://www.elastic.co/guide/en/elasticsearch/reference/current/index-templates.html
//
// Built-in templates like logs-*-* and metrics-*-* have priority 100
//
// EPM generated templates for data streams have priority 200 (DEFAULT_TEMPLATE_PRIORITY)
//
// EPM generated templates for data streams with dataset_is_prefix: true have priority 150 (DATASET_IS_PREFIX_TEMPLATE_PRIORITY)

export function getTemplatePriority(dataStream: RegistryDataStream): number {
  // undefined or explicitly set to false
  // See also https://github.com/elastic/package-spec/pull/102
  if (!dataStream.dataset_is_prefix) {
    return DEFAULT_TEMPLATE_PRIORITY;
  } else {
    return DATASET_IS_PREFIX_TEMPLATE_PRIORITY;
  }
}

// ---------------------------------------------------------------------------
// Namespace-scoped index template helpers
// ---------------------------------------------------------------------------

/**
 * Returns the index template name for a namespace-scoped template.
 * Example: `logs-nginx.access@namespace.production`
 */
export function generateNamespaceTemplateName(baseName: string, namespace: string): string {
  return `${baseName}@namespace.${namespace}`;
}

/**
 * Returns the index pattern for a namespace-scoped template.
 *
 * The pattern matches the data stream name exactly (no trailing wildcard on the
 * namespace segment) so that namespaces with shared prefixes do not collide —
 * e.g. the template for namespace `production` must not also match data streams
 * for `production_eu` or `production_us`.
 *
 * Example (non-prefix): `logs-nginx.access-production`
 * Example (dataset_is_prefix): `metrics-test.*-production`
 * Example (OTel): `traces-generic.otel-production`
 */
export function generateNamespaceTemplateIndexPattern(
  dataStream: RegistryDataStream,
  namespace: string,
  isOtelInputType?: boolean
): string {
  return buildIndexPattern(
    getRegistryDataStreamAssetBaseName(dataStream, isOtelInputType),
    !!dataStream.dataset_is_prefix,
    namespace
  );
}

/**
 * Returns the priority for a namespace-scoped index template.
 * Always higher than the base template so ES picks it for matching data streams.
 *
 * Note: for data streams with `dataset_is_prefix: true`, the base template priority is 150
 * and the namespace template priority is 200 — the same numeric value as a regular base
 * template. This is intentional: Elasticsearch resolves priority ties by index pattern
 * specificity, so the more specific namespace pattern (e.g. `metrics-test.*-production`)
 * wins over the regular base pattern (e.g. `metrics-test.*-*`) even at equal priority.
 */
export function getNamespaceTemplatePriority(dataStream: RegistryDataStream): number {
  return getTemplatePriority(dataStream) + NAMESPACE_TEMPLATE_PRIORITY_BOOST;
}

/**
 * Returns true if the given template ID is a namespace-scoped index template,
 * identifiable by the `@namespace.` discriminator in the name.
 */
export function isNamespaceTemplate(id: string): boolean {
  return id.includes('@namespace.');
}

/**
 * Extracts the namespace from a namespace-scoped template ID.
 * Returns undefined if the ID is not a namespace template.
 * Example: `logs-nginx.access@namespace.production` → `'production'`
 */
export function getNamespaceFromTemplateId(id: string): string | undefined {
  const marker = '@namespace.';
  const idx = id.indexOf(marker);
  if (idx === -1) {
    return undefined;
  }
  return id.slice(idx + marker.length);
}

/**
 * Returns a map of the data stream path fields to elasticsearch index pattern.
 * @param dataStreams an array of RegistryDataStream objects
 */
export function generateESIndexPatterns(
  dataStreams: RegistryDataStream[] | undefined
): Record<string, string> {
  if (!dataStreams) {
    return {};
  }

  const patterns: Record<string, string> = {};
  for (const dataStream of dataStreams) {
    patterns[dataStream.path] = generateTemplateIndexPattern(dataStream);
  }
  return patterns;
}

function getBaseTemplate({
  templateIndexPattern,
  packageName,
  composedOfTemplates,
  templatePriority,
  hidden,
  registryElasticsearch,
  isIndexModeTimeSeries,
}: {
  templateIndexPattern: string;
  packageName: string;
  composedOfTemplates: string[];
  templatePriority: number;
  hidden?: boolean;
  registryElasticsearch: RegistryElasticsearch | undefined;
  isIndexModeTimeSeries?: boolean;
}): IndexTemplate {
  const _meta = getESAssetMetadata({ packageName });

  let settingsIndex = {};
  if (isIndexModeTimeSeries) {
    settingsIndex = {
      mode: 'time_series',
    };
  }

  return {
    priority: templatePriority,
    index_patterns: [templateIndexPattern],
    template: {
      settings: {
        index: settingsIndex,
      },
      mappings: {
        _meta,
      },
    },
    data_stream: {
      hidden: registryElasticsearch?.['index_template.data_stream']?.hidden || hidden,
    },
    composed_of: composedOfTemplates,
    _meta,
  };
}

export const updateCurrentWriteIndices = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  templates: IndexTemplateEntry[],
  options?: {
    ignoreMappingUpdateErrors?: boolean;
    skipDataStreamRollover?: boolean;
  }
): Promise<void> => {
  if (!templates.length) return;

  const allIndices = await queryDataStreamsFromTemplates(esClient, templates);
  const allUpdatablesIndices = allIndices.filter((indice) => {
    if (indice.replicated) {
      logger.warn(
        `Datastream ${indice.dataStreamName} cannot be updated because this is a replicated datastream.`
      );
      return false;
    }
    return true;
  });
  if (!allUpdatablesIndices.length) return;
  return updateAllDataStreams(allUpdatablesIndices, esClient, logger, options);
};

function isCurrentDataStream(item: CurrentDataStream[] | undefined): item is CurrentDataStream[] {
  return item !== undefined;
}

const queryDataStreamsFromTemplates = async (
  esClient: ElasticsearchClient,
  templates: IndexTemplateEntry[]
): Promise<CurrentDataStream[]> => {
  const dataStreamObjects = await pMap(
    templates,
    (template) => {
      return getDataStreams(esClient, template);
    },
    {
      concurrency: MAX_CONCURRENT_DATASTREAM_OPERATIONS,
    }
  );
  return dataStreamObjects.filter(isCurrentDataStream).flat();
};

const getDataStreams = async (
  esClient: ElasticsearchClient,
  template: IndexTemplateEntry
): Promise<CurrentDataStream[] | undefined> => {
  const { indexTemplate } = template;

  const body = await esClient.indices.getDataStream({
    name: indexTemplate.index_patterns.join(','),
    expand_wildcards: ['open', 'hidden'],
  });

  const dataStreams = body.data_streams;
  if (!dataStreams.length) return;
  return dataStreams.map((dataStream: any) => ({
    dataStreamName: dataStream.name,
    replicated: dataStream.replicated,
    indexTemplate,
    currentWriteIndex: dataStream.indices?.at(-1)?.index_name,
  }));
};

const MAPPER_EXCEPTION_REASONS_REQUIRING_ROLLOVER = [
  'subobjects',
  "[enabled] parameter can't be updated for the object mapping",
];

function errorNeedRollover(err: any): boolean {
  if (
    isResponseError(err) &&
    err.statusCode === 400 &&
    err.body?.error?.type === 'illegal_argument_exception'
  ) {
    return true;
  }
  if (
    err.body?.error?.type === 'mapper_exception' &&
    err.body?.error?.reason &&
    MAPPER_EXCEPTION_REASONS_REQUIRING_ROLLOVER.some((reason) =>
      err.body?.error?.reason?.includes(reason)
    )
  ) {
    return true;
  }
  return false;
}

const rolloverDataStream = (dataStreamName: string, esClient: ElasticsearchClient) => {
  try {
    // Do no wrap rollovers in retryTransientEsErrors since it is not idempotent
    return esClient.transport.request({
      method: 'POST',
      path: `/${dataStreamName}/_rollover`,
      querystring: {
        lazy: true,
      },
    });
  } catch (error) {
    throw new PackageESError(
      `Cannot rollover data stream [${dataStreamName}] due to error: ${error}`
    );
  }
};

const updateAllDataStreams = async (
  indexNameWithTemplates: CurrentDataStream[],
  esClient: ElasticsearchClient,
  logger: Logger,
  options?: {
    ignoreMappingUpdateErrors?: boolean;
    skipDataStreamRollover?: boolean;
  }
): Promise<void> => {
  await pMap(
    indexNameWithTemplates,
    (templateEntry) => {
      return updateExistingDataStream({
        esClient,
        logger,
        currentWriteIndex: templateEntry.currentWriteIndex,
        dataStreamName: templateEntry.dataStreamName,
        options,
      });
    },
    {
      concurrency: MAX_CONCURRENT_DATASTREAM_OPERATIONS,
    }
  );
};

const updateExistingDataStream = async ({
  dataStreamName,
  currentWriteIndex,
  esClient,
  logger,
  options,
}: {
  dataStreamName: string;
  currentWriteIndex: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  options?: {
    ignoreMappingUpdateErrors?: boolean;
    skipDataStreamRollover?: boolean;
  };
}) => {
  const existingDs = await esClient.indices.get({
    index: currentWriteIndex,
  });

  const existingDsConfig = Object.values(existingDs);
  const currentBackingIndexConfig = existingDsConfig.at(-1);
  const currentIndexMode = currentBackingIndexConfig?.settings?.index?.mode;
  const currentSourceType = currentBackingIndexConfig?.settings?.index?.mapping?.source?.mode;

  let settings: IndicesIndexSettings;
  let mappings: MappingTypeMapping = {};
  let lifecycle: any;
  let subobjectsFieldChanged: boolean = false;
  let simulateResult: any = {};
  try {
    simulateResult = await retryTransientEsErrors(async () =>
      esClient.indices.simulateTemplate({
        name: await getIndexTemplate(esClient, dataStreamName),
      })
    );

    settings = simulateResult.template.settings;

    try {
      mappings = fillConstantKeywordValues(
        currentBackingIndexConfig?.mappings || {},
        simulateResult.template.mappings || {}
      );
    } catch (err) {
      logger.error(`Error filling constant keyword values: ${err}`);
      mappings = simulateResult.template.mappings;
    }

    lifecycle = simulateResult.template.lifecycle;

    // for now, remove from object so as not to update stream or data stream properties of the index until type and name
    // are added in https://github.com/elastic/kibana/issues/66551.  namespace value we will continue
    // to skip updating and assume the value in the index mapping is correct
    if (mappings && mappings.properties) {
      delete mappings.properties.stream;
      delete mappings.properties.data_stream;
    }
    if (currentBackingIndexConfig?.mappings?.subobjects !== mappings.subobjects) {
      subobjectsFieldChanged = true;
    }

    logger.debug(`Attempt to update the mappings for the ${dataStreamName} (write_index_only)`);
    await retryTransientEsErrors(
      () =>
        esClient.indices.putMapping({
          index: dataStreamName,
          ...mappings,
          write_index_only: true,
        }),
      { logger }
    );

    // if update fails, rollover data stream and bail out
  } catch (err) {
    if (errorNeedRollover(err) || subobjectsFieldChanged) {
      logger.info(`Mappings update for ${dataStreamName} failed due to ${err}`);
      logger.trace(`Attempted mappings: ${mappings}`);
      if (options?.skipDataStreamRollover === true) {
        logger.info(
          `Skipping rollover for ${dataStreamName} as "skipDataStreamRollover" is enabled`
        );
        return;
      } else {
        logger.info(`Triggering a rollover for ${dataStreamName}`);
        await rolloverDataStream(dataStreamName, esClient);
        return;
      }
    }
    logger.error(`Mappings update for ${dataStreamName} failed due to unexpected error: ${err}`);
    logger.trace(`Attempted mappings: ${mappings}`);
    if (options?.ignoreMappingUpdateErrors === true) {
      logger.info(`Ignore mapping update errors as "ignoreMappingUpdateErrors" is enabled`);
      return;
    } else {
      throw err;
    }
  }

  const filterDimensionMappings = (
    templates?: Array<Record<string, MappingDynamicTemplate | undefined>>
  ) =>
    templates?.filter(
      (template) => (Object.values(template)[0]?.mapping as any)?.time_series_dimension
    ) ?? [];

  const currentDynamicDimensionMappings = filterDimensionMappings(
    currentBackingIndexConfig?.mappings?.dynamic_templates
  );
  const updatedDynamicDimensionMappings = filterDimensionMappings(mappings.dynamic_templates);

  const sortMappings = (
    a: Record<string, MappingDynamicTemplate | undefined>,
    b: Record<string, MappingDynamicTemplate | undefined>
  ) => Object.keys(a)[0].localeCompare(Object.keys(b)[0]);

  const dynamicDimensionMappingsChanged = !deepEqual(
    currentDynamicDimensionMappings.sort(sortMappings),
    updatedDynamicDimensionMappings.sort(sortMappings)
  );

  const packageDefinedIndexMode = settings?.index?.mode;
  const packageDefinedSourceMode = settings?.index?.mapping?.source?.mode;

  // Trigger a rollover if the index mode or source type has changed
  if (
    (packageDefinedIndexMode !== undefined && currentIndexMode !== settings?.index?.mode) ||
    (packageDefinedSourceMode !== undefined &&
      currentSourceType !== settings?.index?.mapping?.source?.mode) ||
    dynamicDimensionMappingsChanged
  ) {
    if (options?.skipDataStreamRollover === true) {
      logger.info(
        `Index mode or source type or dynamic dimension mappings have changed for ${dataStreamName}, skipping rollover as "skipDataStreamRollover" is enabled`
      );
      return;
    } else {
      logger.info(
        dynamicDimensionMappingsChanged
          ? `Dynamic dimension mappings changed for ${dataStreamName}, triggering a rollover`
          : `Index mode or source type has changed for ${dataStreamName}, triggering a rollover`
      );
      await rolloverDataStream(dataStreamName, esClient);
    }
  }

  if (lifecycle?.data_retention) {
    try {
      logger.debug(`Updating lifecycle for ${dataStreamName}`);

      await retryTransientEsErrors(
        () =>
          esClient.transport.request({
            method: 'PUT',
            path: `_data_stream/${dataStreamName}/_lifecycle`,
            body: { data_retention: lifecycle.data_retention },
          }),
        { logger }
      );
    } catch (err) {
      // Check if this error can happen because of invalid settings;
      // We are returning a 500 but in that case it should be a 400 instead
      throw new PackageESError(
        `Could not update lifecycle settings for ${dataStreamName}: ${err.message}`
      );
    }
  }

  // update settings after mappings was successful to ensure
  // pointing to the new pipeline is safe
  // for now, only update the pipeline
  if (!settings?.index?.default_pipeline) {
    return;
  }

  try {
    logger.debug(`Updating index settings of data stream  ${dataStreamName}`);

    await retryTransientEsErrors(
      () =>
        esClient.indices.putSettings({
          index: dataStreamName,
          settings: { default_pipeline: settings!.index!.default_pipeline },
        }),
      { logger }
    );
  } catch (err) {
    logger.error(`Error updating index settings of data stream ${dataStreamName}: ${err}`);
    // Same as above - Check if this error can happen because of invalid settings;
    // We are returning a 500 but in that case it should be a 400 instead
    throw new PackageESError(
      `Could not update index settings of data stream ${dataStreamName}: ${err.message}`
    );
  }
};
