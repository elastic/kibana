/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DataView,
  DataViewSpec,
  DataViewsPublicPluginStart,
  FieldSpec,
} from '@kbn/data-views-plugin/public';

/** Prefix applied to evaluation fields stored under the episode `data` object. */
export const DATA_CONTAINER_FIELD_PREFIX = 'data.';

const DATA_CONTAINER_DATA_VIEW_ID_SUFFIX = '-data-container';

const isDocumentMetaField = (name: string): boolean => name.startsWith('_');

export const prefixDataContainerFieldName = (name: string): string =>
  isDocumentMetaField(name) ? name : `${DATA_CONTAINER_FIELD_PREFIX}${name}`;

const prefixRecordKeys = <T>(
  record: Record<string, T> | undefined
): Record<string, T> | undefined => {
  if (!record) {
    return record;
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [prefixDataContainerFieldName(key), value])
  );
};

const prefixSubType = (subType: FieldSpec['subType']): FieldSpec['subType'] => {
  if (!subType) {
    return undefined;
  }

  const nested =
    'nested' in subType && subType.nested?.path
      ? { nested: { path: prefixDataContainerFieldName(subType.nested.path) } }
      : undefined;
  const multi =
    'multi' in subType && subType.multi?.parent
      ? { multi: { parent: prefixDataContainerFieldName(subType.multi.parent) } }
      : undefined;

  return {
    ...subType,
    ...nested,
    ...multi,
  };
};

/**
 * Copies a rule-source data view so field names match the episode `data` object
 * (`host.name` becomes `data.host.name`) while keeping types, formatters, and attributes.
 */
export const prefixDataViewSpecFields = (spec: DataViewSpec): DataViewSpec => {
  const fields = spec.fields
    ? Object.fromEntries(
        Object.values(spec.fields).map((field) => {
          const name = prefixDataContainerFieldName(field.name);
          const subType = prefixSubType(field.subType);
          return [name, { ...field, name, ...(subType ? { subType } : {}) }];
        })
      )
    : undefined;

  return {
    ...spec,
    id: spec.id ? `${spec.id}${DATA_CONTAINER_DATA_VIEW_ID_SUFFIX}` : undefined,
    timeFieldName: spec.timeFieldName
      ? prefixDataContainerFieldName(spec.timeFieldName)
      : undefined,
    fields,
    fieldAttrs: prefixRecordKeys(spec.fieldAttrs),
    fieldFormats: prefixRecordKeys(spec.fieldFormats),
    runtimeFieldMap: prefixRecordKeys(spec.runtimeFieldMap),
    sourceFilters: spec.sourceFilters?.map((filter) => ({
      ...filter,
      value: prefixDataContainerFieldName(filter.value),
    })),
  };
};

/** Builds a data view whose fields line up with a synthetic `{ data: ... }` hit. */
export const createDataContainerDataView = (
  dataView: DataView,
  dataViews: DataViewsPublicPluginStart
): Promise<DataView> =>
  // Skip the field refresh so the prefixed names are not replaced by the source index mapping.
  dataViews.create(prefixDataViewSpecFields(dataView.toSpec()), true);
