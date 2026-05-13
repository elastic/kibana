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
import type { Properties } from './mappings';
import {
  fieldPath,
  dynamicPathMatch,
  fieldTypeRegistry,
  dynamicObjectParentProps,
} from './field_type_registry';

interface RuntimeFields {
  [key: string]: any;
}

export interface WalkContext {
  groupFieldName: string | undefined;
  properties: Properties;
  hasNonDynamicTemplateMappings: boolean;
  hasDynamicTemplateMappings: boolean;
  subobjects: boolean | undefined;
}

export class MappingsBuilder {
  readonly isIndexModeTimeSeries: boolean;

  private readonly dynamicTemplates: Array<Record<string, Properties>> = [];
  private readonly dynamicTemplateNames: Record<string, number> = {};
  private readonly runtimeFields: RuntimeFields = {};

  constructor(isIndexModeTimeSeries: boolean) {
    this.isIndexModeTimeSeries = isIndexModeTimeSeries;
  }

  /**
   * Walk a list of fields and accumulate their mappings into a WalkContext.
   * groupFieldName scopes the dynamic template paths for nested/group fields.
   */
  build(fields: Field[], groupFieldName?: string): WalkContext {
    const context: WalkContext = {
      groupFieldName,
      properties: {},
      hasNonDynamicTemplateMappings: false,
      hasDynamicTemplateMappings: false,
      subobjects: undefined,
    };

    fields.forEach((field) => this.processField(context, field));

    return context;
  }

  private processField(context: WalkContext, field: Field) {
    const type = field.type || 'keyword';

    if (field.runtime !== undefined) {
      this.addRuntimeField(context, field, type);
      return;
    }

    if (type === 'object' && field.object_type) {
      this.addObjectAsDynamicMapping(context, field);
      return;
    }

    const handler = fieldTypeRegistry[type];
    let fieldProps: Properties;

    if (type === 'group') {
      const mapped = this.processGroup(context, field);
      if (mapped === undefined) return;
      fieldProps = mapped;
    } else if (handler) {
      const mapped = handler.staticMapping?.(field, this, context);
      if (mapped === undefined) return;
      fieldProps = mapped;
    } else {
      // Unknown type: pass through as-is (legacy behaviour).
      fieldProps = { ...getDefaultProperties(field), type };
    }

    this.applyCommonProps(fieldProps, field, type);

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

    context.properties[field.name] = fieldProps;
  }

  /**
   * Apply per-walker post-processing that is uniform across all field types:
   * field-level metadata (`meta`), TSDB-only flags (`time_series_metric`,
   * `time_series_dimension`), and `subobjects`.
   *
   * TODO: `time_series_metric` is also applied inside `numericType` and
   * `booleanType` handlers (via `applyTimeSeriesMetric`). The handler-level
   * call uses a truthy check on `field.metric_type` while this method uses a
   * key-existence check; the two diverge for falsy values. Worth unifying
   * once that subtle behavioral difference is confirmed acceptable.
   */
  private applyCommonProps(fieldProps: Properties, field: Field, type: string): void {
    // TODO: when a field has `metric_type` but no `unit`, this assigns
    // `fieldProps.meta = {}` (an empty object). `meta` only ever populates
    // `unit`, so the `metric_type` half of the guard looks unintentional.
    // Confirm whether the empty-meta artifact is expected by downstream
    // consumers before changing behavior.
    const fieldHasMetaProps = 'metric_type' in field || 'unit' in field;
    if (fieldHasMetaProps && type !== 'group' && type !== 'group-nested') {
      const meta: Properties = {};
      if ('unit' in field) meta.unit = field.unit;
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
  }

  private processGroup(context: WalkContext, field: Field): Properties | undefined {
    const handler = fieldTypeRegistry.group;
    const groupResult = handler?.mapGroup?.(field, this, context);
    if (groupResult === undefined) return undefined;

    const fieldProps = groupResult.fieldProps;

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

    return fieldProps;
  }

  private addRuntimeField(context: WalkContext, field: Field, type: string) {
    const path = fieldPath(context.groupFieldName, field.name);

    if (type === 'object' && field.object_type) {
      // Runtime field that is also a dynamic template (e.g. labels.* with runtime: true).
      const objectType = field.object_type;
      const fieldAsObjectType = { ...field, type: objectType };
      const handler = fieldTypeRegistry[objectType];
      const dynResult = handler?.dynamicMapping?.(fieldAsObjectType, this);
      const runtimeProps = handler?.runtimeMapping?.(fieldAsObjectType);

      if (dynResult && runtimeProps) {
        this.addDynamicMappingWithIntermediateObjects(
          context,
          path,
          dynamicPathMatch(path),
          dynResult.matchingType,
          dynResult.properties,
          runtimeProps
        );
        this.addParentObjectAsStaticProperty(context, field);
      }
      return;
    }

    const handler = fieldTypeRegistry[type];
    const runtimeFieldProps = {
      ...getDefaultProperties(field),
      ...(handler?.runtimeMapping?.(field) ?? { type }),
    };
    if (typeof field.runtime === 'string') {
      runtimeFieldProps.script = { source: field.runtime.trim() };
    }
    this.runtimeFields[path] = runtimeFieldProps;
  }

  private addParentObjectAsStaticProperty(context: WalkContext, field: Field) {
    // Don't add intermediate objects for wildcard names, as it will
    // be added for its parent object.
    if (field.name.includes('*')) return;
    context.properties[field.name] = dynamicObjectParentProps(field.subobjects);
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
      this.addDynamicTemplate(name, name, 'object', dynamicObjectParentProps());
    }
  }

  private addObjectAsDynamicMapping(context: WalkContext, field: Field) {
    const path = fieldPath(context.groupFieldName, field.name);
    const objectType = field.object_type!;

    if (objectType === 'group') {
      if (!field.fields) return;
      const subFields = field.fields.map((subField) => ({
        ...subField,
        type: 'object',
        object_type: subField.object_type ?? subField.type,
      }));
      const mappings = this.build(subFields, path);
      if (mappings.hasDynamicTemplateMappings) context.hasDynamicTemplateMappings = true;
      return;
    }

    const handler = fieldTypeRegistry[objectType];
    const result = handler?.dynamicMapping?.({ ...field, type: objectType }, this);

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
      dynamicPathMatch(path),
      result.matchingType,
      result.properties
    );

    // Add the parent object as static property, needed for index templates not using `"dynamic": true`.
    this.addParentObjectAsStaticProperty(context, field);
  }

  private addDynamicTemplate(
    name: string,
    pathMatch: string,
    matchingType: string,
    properties: Properties,
    runtimeProperties?: Properties
  ) {
    if (name in this.dynamicTemplateNames) {
      if (name.includes('*') && properties?.type === 'object') {
        // Conflicting intermediate object: drop the older one so more specific
        // templates are matched first.
        // TODO: this splice does NOT update the recorded indices of entries
        // after `index` in `dynamicTemplateNames`. A subsequent conflict on a
        // later template would splice the wrong entry. Switch to a stable
        // store (e.g. tombstone the entry then compact at the end) before
        // adding more callers of the conflict-resolution path.
        const index = this.dynamicTemplateNames[name];
        delete this.dynamicTemplateNames[name];
        this.dynamicTemplates.splice(index, 1);
      } else {
        return;
      }
    }

    const dynamicTemplate: Properties =
      runtimeProperties !== undefined ? { runtime: runtimeProperties } : { mapping: properties };

    if (matchingType) dynamicTemplate.match_mapping_type = matchingType;
    if (pathMatch) dynamicTemplate.path_match = pathMatch;

    const size = this.dynamicTemplates.push({ [name]: dynamicTemplate });
    this.dynamicTemplateNames[name] = size - 1;
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
