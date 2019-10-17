/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SerializerFunc } from '../shared_imports';
import { Field, DataType, MainType, SubType } from '../types';
import { INDEX_DEFAULT, DATA_TYPE_DEFINITION } from '../constants';
import { getTypeFromSubType } from './utils';

const sanitizeField = (field: Field): Field =>
  Object.entries(field)
    // If a parameter value is "index_default", we remove it
    .filter(({ 1: value }) => value !== INDEX_DEFAULT)
    .reduce(
      (acc, [param, value]) => ({
        ...acc,
        [param]: value,
      }),
      {} as any
    );

export const fieldSerializer: SerializerFunc<Field> = (field: Field) => {
  // If a subType is present, use it as type for ES
  if ({}.hasOwnProperty.call(field, 'subType')) {
    field.type = field.subType as DataType;
    delete field.subType;
  }
  return sanitizeField(field);
};

export const fieldDeserializer: SerializerFunc<Field> = (field: Field): Field => {
  if (!DATA_TYPE_DEFINITION[field.type as MainType]) {
    const type = getTypeFromSubType(field.type as SubType);
    if (!type) {
      throw new Error(
        `Property type "${field.type}" not recognized and no subType was found for it.`
      );
    }
    field.subType = field.type as SubType;
    field.type = type;
  }

  return field;
};
