/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewSpec, FieldSpec } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { inferDataContainerFieldSpecs } from './infer_data_container_fields';

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

const prefixFieldAttrs = (fieldAttrs: DataViewSpec['fieldAttrs']): DataViewSpec['fieldAttrs'] => {
  if (!fieldAttrs) {
    return fieldAttrs;
  }

  // Drop custom labels so the table shows `data.host.name` rather than the source field's label.
  return Object.fromEntries(
    Object.entries(fieldAttrs).flatMap(([key, attrs]) => {
      const rest = { ...attrs };
      delete rest.customLabel;
      if (Object.keys(rest).length === 0) {
        return [];
      }
      return [[prefixDataContainerFieldName(key), rest]];
    })
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
          // A source label such as "Host" would hide the `data.` name the table is meant to show.
          const withoutLabel = { ...field };
          delete withoutLabel.customLabel;
          return [name, { ...withoutLabel, name, ...(subType ? { subType } : {}) }];
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
    fieldAttrs: prefixFieldAttrs(spec.fieldAttrs),
    fieldFormats: prefixRecordKeys(spec.fieldFormats),
    runtimeFieldMap: prefixRecordKeys(spec.runtimeFieldMap),
    sourceFilters: spec.sourceFilters?.map((filter) => ({
      ...filter,
      value: prefixDataContainerFieldName(filter.value),
    })),
  };
};

// Base id of the data view guessed from the alert `data` alone, when there is no rule query.
const INFERRED_DATA_VIEW_ID = 'alerting-v2-episode';

export interface CreateDataContainerDataViewOptions {
  /** Data view built from the rule query, if any. Its fields win over the guessed ones. */
  sourceDataView?: DataView;
  /** The alert `data` object, used to guess the type of fields the source doesn't know. */
  data: Record<string, unknown>;
  fieldFormats: FieldFormatsStartCommon;
}

/**
 * Builds an in-memory data view whose `data.*` fields match the episode `data` object. Types and
 * formatters come from the rule source data view when there is one, and are guessed from the
 * values otherwise (e.g. ruleless alerts, or columns computed by the rule query).
 */
export const createDataContainerDataView = ({
  sourceDataView,
  data,
  fieldFormats,
}: CreateDataContainerDataViewOptions): DataView => {
  const sourceSpec: DataViewSpec = sourceDataView?.toSpec() ?? {
    id: INFERRED_DATA_VIEW_ID,
    title: 'data',
  };
  const spec = prefixDataViewSpecFields({
    ...sourceSpec,
    fields: { ...inferDataContainerFieldSpecs(data), ...sourceSpec.fields },
  });

  return new DataView({
    spec,
    fieldFormats,
    // No field is named `data`, so flattenHit walks into the synthetic hit and `data.C` matches.
    metaFields: sourceDataView?.metaFields,
  });
};
