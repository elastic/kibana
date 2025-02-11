/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
import type { FleetConfigType } from '../../../../../common/types';
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

const META_PROP_KEYS = ['metric_type', 'unit'];

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
  mappings,
  isIndexModeTimeSeries,
  type,
}: {
  templateIndexPattern: string;
  packageName: string;
  composedOfTemplates: string[];
  templatePriority: number;
  mappings: IndexTemplateMappings;
  type: string;
  hidden?: boolean;
  registryElasticsearch?: RegistryElasticsearch | undefined;
  isIndexModeTimeSeries?: boolean;
}): IndexTemplate {
  const template = getBaseTemplate({
    templateIndexPattern,
    packageName,
    composedOfTemplates,
    templatePriority,
    registryElasticsearch,
    hidden,
    mappings,
    isIndexModeTimeSeries,
  });
  if (template.template.settings.index.final_pipeline) {
    throw new PackageInvalidArchiveError(
      `Error template for ${templateIndexPattern} contains a final_pipeline`
    );
  }

  const esBaseComponents = getBaseEsComponents(type, !!isIndexModeTimeSeries);

  const isEventIngestedEnabled = (config?: FleetConfigType): boolean =>
    Boolean(!config?.agentIdVerificationEnabled && config?.eventIngestedEnabled);

  template.composed_of = [
    ...esBaseComponents,
    ...(template.composed_of || []),
    STACK_COMPONENT_TEMPLATE_ECS_MAPPINGS,
    FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME,
    ...(appContextService.getConfig()?.agentIdVerificationEnabled
      ? [FLEET_AGENT_ID_VERIFY_COMPONENT_TEMPLATE_NAME]
      : []),
    ...(isEventIngestedEnabled(appContextService.getConfig())
      ? [FLEET_EVENT_INGESTED_COMPONENT_TEMPLATE_NAME]
      : []),
  ];

  template.ignore_missing_component_templates = template.composed_of.filter(isUserSettingsTemplate);

  return template;
}

const getBaseEsComponents = (type: string, isIndexModeTimeSeries: boolean): string[] => {
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

/**
 * Generate mapping takes the given nested fields array and creates the Elasticsearch
 * mapping properties out of it.
 *
 * This assumes that all fields with dotted.names have been expanded in a previous step.
 *
 * @param fields
 */
export function generateMappings(
  fields: Field[],
  isIndexModeTimeSeries = false
): IndexTemplateMappings {
  const dynamicTemplates: Array<Record<string, Properties>> = [];
  const dynamicTemplateNames: Record<string, number> = {};
  const runtimeFields: RuntimeFields = {};

  const { properties } = _generateMappings(
    fields,
    {
      addDynamicMapping: (dynamicMapping: {
        path: string;
        matchingType: string;
        pathMatch: string;
        properties: Properties;
        runtimeProperties?: Properties;
      }) => {
        const name = dynamicMapping.path;
        if (name in dynamicTemplateNames) {
          if (name.includes('*') && dynamicMapping.properties?.type === 'object') {
            // This is a conflicting intermediate object, use the last one so
            // more specific templates are chosen before.
            const index = dynamicTemplateNames[name];
            delete dynamicTemplateNames[name];
            dynamicTemplates.splice(index, 1);
          } else {
            return;
          }
        }

        const dynamicTemplate: Properties = {};
        if (dynamicMapping.runtimeProperties !== undefined) {
          dynamicTemplate.runtime = dynamicMapping.runtimeProperties;
        } else {
          dynamicTemplate.mapping = dynamicMapping.properties;
        }

        if (dynamicMapping.matchingType) {
          dynamicTemplate.match_mapping_type = dynamicMapping.matchingType;
        }

        if (dynamicMapping.pathMatch) {
          dynamicTemplate.path_match = dynamicMapping.pathMatch;
        }

        const size = dynamicTemplates.push({ [name]: dynamicTemplate });
        dynamicTemplateNames[name] = size - 1;
      },
      addRuntimeField: (runtimeField: { path: string; properties: Properties }) => {
        runtimeFields[`${runtimeField.path}`] = runtimeField.properties;
      },
    },
    isIndexModeTimeSeries
  );

  const indexTemplateMappings: IndexTemplateMappings = { properties };
  if (dynamicTemplates.length > 0) {
    indexTemplateMappings.dynamic_templates = dynamicTemplates;
  }
  if (Object.keys(runtimeFields).length > 0) {
    indexTemplateMappings.runtime = runtimeFields;
  }
  return indexTemplateMappings;
}

/**
 * Generate mapping takes the given nested fields array and creates the Elasticsearch
 * mapping properties out of it.
 *
 * This assumes that all fields with dotted.names have been expanded in a previous step.
 *
 * @param fields
 */
function _generateMappings(
  fields: Field[],
  ctx: {
    addDynamicMapping: any;
    addRuntimeField: any;
    groupFieldName?: string;
  },
  isIndexModeTimeSeries: boolean
): {
  properties: IndexTemplateMappings['properties'];
  hasNonDynamicTemplateMappings: boolean;
  hasDynamicTemplateMappings: boolean;
  subobjects?: boolean;
} {
  let hasNonDynamicTemplateMappings = false;
  let hasDynamicTemplateMappings = false;
  let subobjects: boolean | undefined;
  const props: Properties = {};

  function addParentObjectAsStaticProperty(field: Field) {
    // Don't add intermediate objects for wildcard names, as it will
    // be added for its parent object.
    if (field.name.includes('*')) {
      return;
    }

    const fieldProps = {
      type: 'object',
      dynamic: true,
      ...(field.subobjects !== undefined && { subobjects: field.subobjects }),
    };

    props[field.name] = fieldProps;
    hasNonDynamicTemplateMappings = true;
  }

  function addDynamicMappingWithIntermediateObjects(
    path: string,
    pathMatch: string,
    matchingType: string,
    dynProperties: Properties,
    fieldProps?: Properties
  ) {
    ctx.addDynamicMapping({
      path,
      pathMatch,
      matchingType,
      properties: dynProperties,
      runtimeProperties: fieldProps,
    });
    hasDynamicTemplateMappings = true;

    // Add dynamic intermediate objects.
    const parts = pathMatch.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const name = parts.slice(0, i).join('.');
      if (!name.includes('*')) {
        continue;
      }
      const dynProps: Properties = {
        type: 'object',
        dynamic: true,
      };
      ctx.addDynamicMapping({
        path: name,
        pathMatch: name,
        matchingType: 'object',
        properties: dynProps,
      });
    }
  }

  function addObjectAsDynamicMapping(field: Field) {
    const path = ctx.groupFieldName ? `${ctx.groupFieldName}.${field.name}` : field.name;
    const pathMatch = path.includes('*') ? path : `${path}.*`;

    let dynProperties: Properties = getDefaultProperties(field);
    let matchingType: string | undefined;
    switch (field.object_type) {
      case 'histogram':
        dynProperties = histogram(field);
        matchingType = field.object_type_mapping_type ?? '*';
        break;
      case 'ip':
      case 'keyword':
      case 'match_only_text':
      case 'text':
      case 'wildcard':
        dynProperties.type = field.object_type;
        matchingType = field.object_type_mapping_type ?? 'string';
        break;
      case 'scaled_float':
        dynProperties = scaledFloat(field);
        matchingType = field.object_type_mapping_type ?? '*';
        break;
      case 'aggregate_metric_double':
        dynProperties.type = field.object_type;
        dynProperties.metrics = field.metrics;
        dynProperties.default_metric = field.default_metric;
        matchingType = field.object_type_mapping_type ?? '*';
        break;
      case 'double':
      case 'float':
      case 'half_float':
        dynProperties.type = field.object_type;
        if (isIndexModeTimeSeries) {
          dynProperties.time_series_metric = field.metric_type;
        }
        matchingType = field.object_type_mapping_type ?? 'double';
        break;
      case 'byte':
      case 'long':
      case 'short':
      case 'unsigned_long':
        dynProperties.type = field.object_type;
        if (isIndexModeTimeSeries) {
          dynProperties.time_series_metric = field.metric_type;
        }
        matchingType = field.object_type_mapping_type ?? 'long';
        break;
      case 'integer':
        // Map integers as long, as in other cases.
        dynProperties.type = 'long';
        if (isIndexModeTimeSeries) {
          dynProperties.time_series_metric = field.metric_type;
        }
        matchingType = field.object_type_mapping_type ?? 'long';
        break;
      case 'boolean':
        dynProperties.type = field.object_type;
        if (isIndexModeTimeSeries) {
          dynProperties.time_series_metric = field.metric_type;
        }
        matchingType = field.object_type_mapping_type ?? field.object_type;
        break;
      case 'group':
        if (!field?.fields) {
          break;
        }
        const subFields = field.fields.map((subField) => ({
          ...subField,
          type: 'object',
          object_type: subField.object_type ?? subField.type,
        }));
        const mappings = _generateMappings(
          subFields,
          {
            ...ctx,
            groupFieldName: ctx.groupFieldName ? `${ctx.groupFieldName}.${field.name}` : field.name,
          },
          isIndexModeTimeSeries
        );
        if (mappings.hasDynamicTemplateMappings) {
          hasDynamicTemplateMappings = true;
        }
        break;
      case 'flattened':
        dynProperties.type = field.object_type;
        matchingType = field.object_type_mapping_type ?? 'object';
        break;
      default:
        throw new PackageInvalidArchiveError(
          `No dynamic mapping generated for field ${path} of type ${field.object_type}`
        );
    }

    if (field.dimension && isIndexModeTimeSeries) {
      dynProperties.time_series_dimension = field.dimension;
    }

    // When a wildcard field specifies the subobjects setting,
    // the parent intermediate object should set the subobjects
    // setting.
    //
    // For example, if a wildcard field `foo.*` has subobjects,
    // we should set subobjects on the intermediate object `foo`.
    //
    if (field.subobjects !== undefined && path.includes('*')) {
      subobjects = field.subobjects;
    }

    if (dynProperties && matchingType) {
      addDynamicMappingWithIntermediateObjects(path, pathMatch, matchingType, dynProperties);

      // Add the parent object as static property, this is needed for
      // index templates not using `"dynamic": true`.
      addParentObjectAsStaticProperty(field);
    }
  }

  // TODO: this can happen when the fields property in fields.yml is present but empty
  // Maybe validation should be moved to fields/field.ts
  if (fields) {
    fields.forEach((field) => {
      // If type is not defined, assume keyword
      const type = field.type || 'keyword';

      if (field.runtime !== undefined) {
        const path = ctx.groupFieldName ? `${ctx.groupFieldName}.${field.name}` : field.name;
        let runtimeFieldProps: Properties = getDefaultProperties(field);

        // Is it a dynamic template?
        if (type === 'object' && field.object_type) {
          const pathMatch = path.includes('*') ? path : `${path}.*`;

          const dynProperties: Properties = getDefaultProperties(field);
          let matchingType: string | undefined;
          switch (field.object_type) {
            case 'keyword':
              dynProperties.type = field.object_type;
              matchingType = field.object_type_mapping_type ?? 'string';
              break;
            case 'double':
            case 'long':
            case 'boolean':
              dynProperties.type = field.object_type;
              if (isIndexModeTimeSeries) {
                dynProperties.time_series_metric = field.metric_type;
              }
              matchingType = field.object_type_mapping_type ?? field.object_type;
            default:
              break;
          }

          // get the runtime properies of this field assuming type equals to object_type
          const _field = { ...field, type: field.object_type };
          const fieldProps = generateRuntimeFieldProps(_field);

          if (dynProperties && matchingType) {
            addDynamicMappingWithIntermediateObjects(
              path,
              pathMatch,
              matchingType,
              dynProperties,
              fieldProps
            );

            // Add the parent object as static property, this is needed for
            // index templates not using `"dynamic": true`.
            addParentObjectAsStaticProperty(field);
          }
          return;
        }
        const fieldProps = generateRuntimeFieldProps(field);
        runtimeFieldProps = { ...runtimeFieldProps, ...fieldProps };

        ctx.addRuntimeField({ path, properties: runtimeFieldProps });
        return; // runtime fields should not be added as a property
      }

      if (type === 'object' && field.object_type) {
        addObjectAsDynamicMapping(field);
      } else {
        let fieldProps = getDefaultProperties(field);

        switch (type) {
          case 'group':
            const mappings = _generateMappings(
              field.fields!,
              {
                ...ctx,
                groupFieldName: ctx.groupFieldName
                  ? `${ctx.groupFieldName}.${field.name}`
                  : field.name,
              },
              isIndexModeTimeSeries
            );
            if (field.object_type) {
              // A group can have an object_type if it has been merged with an object during deduplication,
              // generate also the dynamic mapping for the object.
              addObjectAsDynamicMapping(field);
              mappings.hasDynamicTemplateMappings = true;
            }
            if (mappings.hasNonDynamicTemplateMappings) {
              fieldProps = {
                properties:
                  Object.keys(mappings.properties).length > 0 ? mappings.properties : undefined,
                ...generateDynamicAndEnabled(field),
              };
              if (mappings.hasDynamicTemplateMappings) {
                fieldProps.type = 'object';
                fieldProps.dynamic = true;
              }
            } else if (mappings.hasDynamicTemplateMappings) {
              fieldProps = {
                type: 'object',
                dynamic: true,
              };
              hasDynamicTemplateMappings = true;
            } else {
              return;
            }
            if (mappings.subobjects !== undefined) {
              fieldProps.subobjects = mappings.subobjects;
            }
            break;
          case 'nested':
          case 'group-nested':
            fieldProps = { ...generateNestedProps(field), type: 'nested' };
            if (field.fields) {
              fieldProps.properties = _generateMappings(
                field.fields!,
                {
                  ...ctx,
                  groupFieldName: ctx.groupFieldName
                    ? `${ctx.groupFieldName}.${field.name}`
                    : field.name,
                },
                isIndexModeTimeSeries
              ).properties;
            }
            break;
          case 'integer':
            fieldProps.type = 'long';
            break;
          case 'scaled_float':
            fieldProps = scaledFloat(field);
            break;
          case 'text':
            const textMapping = generateTextMapping(field);
            fieldProps = { ...fieldProps, ...textMapping, type: 'text' };
            if (field.multi_fields) {
              fieldProps.fields = generateMultiFields(field.multi_fields);
            }
            break;
          case 'object':
            fieldProps = { ...fieldProps, ...generateDynamicAndEnabled(field), type: 'object' };
            break;
          case 'keyword':
            fieldProps = keyword(field);
            if (field.multi_fields) {
              fieldProps.fields = generateMultiFields(field.multi_fields);
            }
            break;
          case 'wildcard':
            const wildcardMapping = generateWildcardMapping(field);
            fieldProps = { ...fieldProps, ...wildcardMapping, type: 'wildcard' };
            if (field.multi_fields) {
              fieldProps.fields = generateMultiFields(field.multi_fields);
            }
            break;
          case 'constant_keyword':
            fieldProps.type = field.type;
            if (field.value) {
              fieldProps.value = field.value;
            }
            break;
          case 'array':
            // this assumes array fields were validated in an earlier step
            // adding an array field with no object_type would result in an error
            // when the template is added to ES
            if (field.object_type) {
              fieldProps.type = field.object_type;
            }
            break;
          case 'alias':
            // this assumes alias fields were validated in an earlier step
            // adding a path to a field that doesn't exist would result in an error
            // when the template is added to ES.
            fieldProps.type = 'alias';
            fieldProps.path = field.path;
            break;
          case 'date':
            const dateMappings = generateDateMapping(field);
            fieldProps = { ...fieldProps, ...dateMappings, type: 'date' };
            break;
          case 'aggregate_metric_double':
            fieldProps = {
              ...fieldProps,
              metrics: field.metrics,
              default_metric: field.default_metric,
              type: 'aggregate_metric_double',
            };
            break;
          default:
            fieldProps.type = type;
        }

        const fieldHasMetaProps = META_PROP_KEYS.some((key) => key in field);
        if (fieldHasMetaProps) {
          switch (type) {
            case 'group':
            case 'group-nested':
              break;
            default: {
              const meta = {};
              if ('unit' in field) Reflect.set(meta, 'unit', field.unit);
              fieldProps.meta = meta;
            }
          }
        }

        if ('metric_type' in field && isIndexModeTimeSeries) {
          fieldProps.time_series_metric = field.metric_type;
        }
        if (field.dimension && isIndexModeTimeSeries) {
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
      }
    });
  }

  return {
    properties: props,
    hasNonDynamicTemplateMappings,
    hasDynamicTemplateMappings,
    subobjects,
  };
}

function generateDynamicAndEnabled(field: Field) {
  const props: Properties = {};
  if (Object.hasOwn(field, 'enabled')) {
    props.enabled = field.enabled;
  }
  if (Object.hasOwn(field, 'dynamic')) {
    props.dynamic = field.dynamic;
  }
  return props;
}

function generateNestedProps(field: Field) {
  const props = generateDynamicAndEnabled(field);

  if (Object.hasOwn(field, 'include_in_parent')) {
    props.include_in_parent = field.include_in_parent;
  }
  if (Object.hasOwn(field, 'include_in_root')) {
    props.include_in_root = field.include_in_root;
  }
  return props;
}

function generateMultiFields(fields: Fields): MultiFields {
  const multiFields: MultiFields = {};
  if (fields) {
    fields.forEach((f: Field) => {
      const type = f.type;
      switch (type) {
        case 'text':
          multiFields[f.name] = { ...generateTextMapping(f), type: f.type };
          break;
        case 'keyword':
          multiFields[f.name] = keyword(f);
          break;
        case 'long':
        case 'double':
        case 'match_only_text':
          multiFields[f.name] = { type: f.type };
          break;
      }
    });
  }
  return multiFields;
}

function generateTextMapping(field: Field): IndexTemplateMapping {
  const mapping: IndexTemplateMapping = {};
  if (field.analyzer) {
    mapping.analyzer = field.analyzer;
  }
  if (field.search_analyzer) {
    mapping.search_analyzer = field.search_analyzer;
  }
  return mapping;
}

function generateWildcardMapping(field: Field): IndexTemplateMapping {
  const mapping: IndexTemplateMapping = {
    ignore_above: DEFAULT_IGNORE_ABOVE,
  };
  if (field.null_value) {
    mapping.null_value = field.null_value;
  }
  if (field.ignore_above) {
    mapping.ignore_above = field.ignore_above;
  }
  return mapping;
}

function generateDateMapping(field: Field): IndexTemplateMapping {
  const mapping: IndexTemplateMapping = {};
  if (field.date_format) {
    mapping.format = field.date_format;
  }

  if (field.name === '@timestamp') {
    mapping.ignore_malformed = false;
  }

  return mapping;
}

function generateRuntimeFieldProps(field: Field): IndexTemplateMapping {
  let mapping: IndexTemplateMapping = {};
  const type = field.type || keyword;
  switch (type) {
    case 'integer':
      mapping.type = 'long';
      break;
    case 'date':
      const dateMappings = generateDateMapping(field);
      mapping = { ...mapping, ...dateMappings, type: 'date' };
      break;
    default:
      mapping.type = type;
  }

  if (typeof field.runtime === 'string') {
    const scriptObject = {
      source: field.runtime.trim(),
    };
    mapping.script = scriptObject;
  }
  return mapping;
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

export function generateTemplateIndexPattern(dataStream: RegistryDataStream): string {
  // undefined or explicitly set to false
  // See also https://github.com/elastic/package-spec/pull/102
  if (!dataStream.dataset_is_prefix) {
    return getRegistryDataStreamAssetBaseName(dataStream) + '-*';
  } else {
    return getRegistryDataStreamAssetBaseName(dataStream) + '.*-*';
  }
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

const flattenFieldsToNameAndType = (
  fields: Fields,
  path: string = ''
): Array<Pick<Field, 'name' | 'type'>> => {
  let newFields: Array<Pick<Field, 'name' | 'type'>> = [];
  fields.forEach((field) => {
    const fieldName = path ? `${path}.${field.name}` : field.name;
    newFields.push({
      name: fieldName,
      type: field.type,
    });
    if (field.fields && field.fields.length) {
      newFields = newFields.concat(flattenFieldsToNameAndType(field.fields, fieldName));
    }
  });
  return newFields;
};

function getBaseTemplate({
  templateIndexPattern,
  packageName,
  composedOfTemplates,
  templatePriority,
  hidden,
  registryElasticsearch,
  mappings,
  isIndexModeTimeSeries,
}: {
  templateIndexPattern: string;
  packageName: string;
  composedOfTemplates: string[];
  templatePriority: number;
  hidden?: boolean;
  registryElasticsearch: RegistryElasticsearch | undefined;
  mappings: IndexTemplateMappings;
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

function errorNeedRollover(err: any) {
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
  // @ts-expect-error Property 'source.mode' does not exist on type 'IndicesMappingLimitSettings'
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

    logger.info(`Attempt to update the mappings for the ${dataStreamName} (write_index_only)`);
    await retryTransientEsErrors(
      () =>
        esClient.indices.putMapping({
          index: dataStreamName,
          body: mappings || {},
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

  const filterDimensionMappings = (templates?: Array<Record<string, MappingDynamicTemplate>>) =>
    templates?.filter(
      (template) => (Object.values(template)[0].mapping as any)?.time_series_dimension
    ) ?? [];

  const currentDynamicDimensionMappings = filterDimensionMappings(
    currentBackingIndexConfig?.mappings?.dynamic_templates
  );
  const updatedDynamicDimensionMappings = filterDimensionMappings(mappings.dynamic_templates);

  const sortMappings = (
    a: Record<string, MappingDynamicTemplate>,
    b: Record<string, MappingDynamicTemplate>
  ) => Object.keys(a)[0].localeCompare(Object.keys(b)[0]);

  const dynamicDimensionMappingsChanged = !deepEqual(
    currentDynamicDimensionMappings.sort(sortMappings),
    updatedDynamicDimensionMappings.sort(sortMappings)
  );

  // Trigger a rollover if the index mode or source type has changed
  if (
    currentIndexMode !== settings?.index?.mode ||
    // @ts-expect-error Property 'source.mode' does not exist on type 'IndicesMappingLimitSettings'
    currentSourceType !== settings?.index?.mapping?.source?.mode ||
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
          body: { default_pipeline: settings!.index!.default_pipeline },
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
