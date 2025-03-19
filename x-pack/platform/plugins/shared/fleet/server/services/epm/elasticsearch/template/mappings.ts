/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Field } from '../../fields/field';

const DEFAULT_SCALING_FACTOR = 1000;
const DEFAULT_IGNORE_ABOVE = 1024;

interface Properties {
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

export function keyword(field: Field): Properties {
  const fieldProps = getDefaultProperties(field);
  fieldProps.type = 'keyword';

  if (field.ignore_above) {
    fieldProps.ignore_above = field.ignore_above;
  } else {
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
