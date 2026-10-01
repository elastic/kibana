/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Field } from '../../fields/field';

const DEFAULT_SCALING_FACTOR = 1000;
const DEFAULT_IGNORE_ABOVE = 1024;

export interface Properties {
  [key: string]: any;
}

export function getDefaultProperties(field: Field): Properties {
  const properties: Properties = {};

  if (field.index !== undefined) {
    properties.index = field.index;
  }
  if (field.doc_values !== undefined) {
    properties.doc_values = field.doc_values;
  }
  if (field.copy_to) {
    properties.copy_to = field.copy_to;
  }
  if (field.store !== undefined) {
    properties.store = field.store;
  }

  return properties;
}

/**
 * Apply a field's `columnar` block (package-spec 3.7.0) to its generated mapping.
 *
 * The block is only honoured when the resolved index mode belongs to the columnar family
 * (`columnar` / `logsdb_columnar`), mirroring how `dimension` is only emitted as
 * `time_series_dimension` for `time_series`. In any other index mode the block is ignored
 * entirely.
 *
 * This must run *after* all other `doc_values`/`index` handling so that the explicit override
 * wins, and only keys that are present in the block are emitted.
 */
export function applyColumnarOverrides(
  properties: Properties,
  field: Field,
  isIndexModeColumnar: boolean
): void {
  if (!isIndexModeColumnar || !field.columnar) {
    return;
  }

  if (field.columnar.doc_values !== undefined) {
    properties.doc_values = field.columnar.doc_values;
  }
  if (field.columnar.index !== undefined) {
    properties.index = field.columnar.index;
  }
}

export function scaledFloat(field: Field): Properties {
  const fieldProps = getDefaultProperties(field);
  fieldProps.type = 'scaled_float';
  fieldProps.scaling_factor = field.scaling_factor || DEFAULT_SCALING_FACTOR;

  return fieldProps;
}

export function histogram(field: Field): Properties {
  const fieldProps = getDefaultProperties(field);
  fieldProps.type = 'histogram';

  return fieldProps;
}

export function keyword(field: Field, isDynamic?: boolean): Properties {
  const fieldProps = getDefaultProperties(field);
  fieldProps.type = 'keyword';

  if (field.ignore_above) {
    fieldProps.ignore_above = field.ignore_above;
  } else if (!isDynamic) {
    fieldProps.ignore_above = DEFAULT_IGNORE_ABOVE;
  }
  if (field.normalizer) {
    fieldProps.normalizer = field.normalizer;
  }
  if (field.dimension) {
    delete fieldProps.ignore_above;
  }

  if (field.index === false || field.doc_values === false) {
    delete fieldProps.ignore_above;
  }

  return fieldProps;
}
