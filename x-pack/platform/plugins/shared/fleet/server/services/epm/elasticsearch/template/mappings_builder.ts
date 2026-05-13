/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Field } from '../../fields/field';
import type { IndexTemplateMappings } from '../../../../types';
import { PackageInvalidArchiveError } from '../../../../errors';

import { getDefaultProperties } from './mappings';
import { fieldPath, dynamicPathMatch, fieldTypeRegistry } from './field_type_registry';
import type { GroupType } from './field_type_registry';

export interface Properties {
  [key: string]: any;
}

export interface MultiFields {
  [key: string]: object;
}

export interface RuntimeFields {
  [key: string]: any;
}

export interface DynamicMappingResult {
  properties: Properties;
  matchingType: string;
}

export interface WalkContext {
  groupFieldName: string | undefined;
  props: Properties;
  hasNonDynamicTemplateMappings: boolean;
  hasDynamicTemplateMappings: boolean;
  subobjects: boolean | undefined;
}

export type WalkResult = Omit<WalkContext, 'props'> & { properties: Properties };

const META_PROP_KEYS = ['metric_type', 'unit'];

export class MappingsBuilder {
  readonly isIndexModeTimeSeries: boolean;

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
    const context: WalkContext = {
      groupFieldName,
      props: {},
      hasNonDynamicTemplateMappings: false,
      hasDynamicTemplateMappings: false,
      subobjects: undefined,
    };

    // TODO: this can happen when the fields property in fields.yml is present but empty.
    // Maybe validation should be moved to fields/field.ts.
    if (fields) {
      fields.forEach((field) => this.processField(context, field));
    }

    const { props: properties, ...rest } = context;
    return { properties, ...rest };
  }

  private processField(context: WalkContext, field: Field) {
    // If type is not defined, assume keyword
    const type = field.type || 'keyword';

    if (field.runtime !== undefined) {
      const path = fieldPath(context.groupFieldName, field.name);

      if (type === 'object' && field.object_type) {
        // Runtime field that is also a dynamic template (e.g. labels.* with runtime: true).
        const pMatch = dynamicPathMatch(path);
        const objectType = field.object_type;

        const handler = fieldTypeRegistry[objectType];
        const dynResult = handler?.dynamicMapping({ ...field, type: objectType }, this);
        const runtimeProps = handler?.runtimeMapping({ ...field, type: objectType });

        if (dynResult && runtimeProps) {
          this.addDynamicMappingWithIntermediateObjects(
            context,
            path,
            pMatch,
            dynResult.matchingType,
            dynResult.properties,
            runtimeProps
          );
          this.addParentObjectAsStaticProperty(context, field);
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
      this.addObjectAsDynamicMapping(context, field);
      return;
    }

    const handler = fieldTypeRegistry[type];
    let fieldProps: Properties;

    if (type === 'group') {
      const groupHandler = handler as GroupType;
      const groupResult = groupHandler.mapGroup(field, this, context);
      if (groupResult === undefined) return;

      fieldProps = groupResult.fieldProps;

      // Only propagate hasDynamicTemplateMappings upward when the group produced
      // no static properties — matching original behavior.
      if (groupResult.onlyDynamicTemplateMappings) context.hasDynamicTemplateMappings = true;

      // A group that also has an object_type was merged with an object during deduplication.
      // Generate the dynamic mapping for the object side too, and mark the group as dynamic.
      if (field.object_type) {
        this.addObjectAsDynamicMapping(context, field);
        context.hasDynamicTemplateMappings = true;
        fieldProps.type = 'object';
        fieldProps.dynamic = true;
      }
    } else if (handler) {
      const mapped = handler.staticMapping(field, this, context);
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
    context.hasNonDynamicTemplateMappings = true;

    // Avoid including maps with wildcards, they have generated dynamic mappings.
    if (field.name.includes('*')) {
      context.hasDynamicTemplateMappings = true;
      return;
    }

    context.props[field.name] = fieldProps;
  }

  private addParentObjectAsStaticProperty(context: WalkContext, field: Field) {
    // Don't add intermediate objects for wildcard names, as it will
    // be added for its parent object.
    if (field.name.includes('*')) return;
    context.props[field.name] = {
      type: 'object',
      dynamic: true,
      ...(field.subobjects !== undefined && { subobjects: field.subobjects }),
    };
    context.hasNonDynamicTemplateMappings = true;
  }

  private addDynamicMappingWithIntermediateObjects(
    context: WalkContext,
    path: string,
    pathMatch: string,
    matchingType: string,
    dynProperties: Properties,
    runtimeProperties?: Properties
  ) {
    this.addDynamicTemplate(path, pathMatch, matchingType, dynProperties, runtimeProperties);
    context.hasDynamicTemplateMappings = true;

    // Add dynamic intermediate objects.
    const parts = pathMatch.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const name = parts.slice(0, i).join('.');
      if (!name.includes('*')) continue;
      this.addDynamicTemplate(name, name, 'object', { type: 'object', dynamic: true });
    }
  }

  private addObjectAsDynamicMapping(context: WalkContext, field: Field) {
    const path = fieldPath(context.groupFieldName, field.name);
    const pMatch = dynamicPathMatch(path);
    const objectType = field.object_type!;

    if (objectType === 'group') {
      if (!field.fields) return;
      const subFields = field.fields.map((subField) => ({
        ...subField,
        type: 'object',
        object_type: subField.object_type ?? subField.type,
      }));
      const mappings = this.build(subFields, fieldPath(context.groupFieldName, field.name));
      if (mappings.hasDynamicTemplateMappings) context.hasDynamicTemplateMappings = true;
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
      context.subobjects = field.subobjects;
    }

    this.addDynamicMappingWithIntermediateObjects(
      context,
      path,
      pMatch,
      result.matchingType,
      result.properties
    );

    // Add the parent object as static property, needed for index templates not using `"dynamic": true`.
    this.addParentObjectAsStaticProperty(context, field);
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
