/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SerializerFunc } from '../shared_imports';
import {
  PARAMETER_SERIALIZERS,
  PARAMETER_DESERIALIZERS,
} from '../components/document_fields/field_parameters';
import { Field, DataType, MainType, SubType } from '../types';
import { INDEX_DEFAULT, MAIN_DATA_TYPE_DEFINITION } from '../constants';
import { getMainTypeFromSubType } from './utils';

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

/**
 * Run custom parameter serializers on field.
 * Each serializer takes the field as single argument and returns it serialized in an immutable way.
 * @param field The field we are serializing
 */
const runParametersSerializers = (field: Field): Field =>
  PARAMETER_SERIALIZERS.reduce((fieldSerialized, serializer) => serializer(fieldSerialized), field);

/**
 * Run custom parameter deserializers on field.
 * Each deserializer takes the field as single argument and returns it deserialized in an immutable way.
 * @param field The field we are deserializing
 */
const runParametersDeserializers = (field: Field): Field =>
  PARAMETER_DESERIALIZERS.reduce(
    (fieldDeserialized, serializer) => serializer(fieldDeserialized),
    field
  );

export const fieldSerializer: SerializerFunc<Field> = (field: Field) => {
  // If a subType is present, use it as type for ES
  if ({}.hasOwnProperty.call(field, 'subType')) {
    field.type = field.subType as DataType;
    delete field.subType;
  }

  // Delete temp fields
  delete (field as any).useSameAnalyzerForSearch;

  return sanitizeField(runParametersSerializers(field));
};

export const fieldDeserializer: SerializerFunc<Field> = (field: Field): Field => {
  if (!MAIN_DATA_TYPE_DEFINITION[field.type as MainType]) {
    // IF the type if not one of the main one, it is then probably a "sub" type.
    const type = getMainTypeFromSubType(field.type as SubType);
    if (!type) {
      throw new Error(
        `Property type "${field.type}" not recognized and no subType was found for it.`
      );
    }
    field.subType = field.type as SubType;
    field.type = type;
  }

  (field as any).useSameAnalyzerForSearch =
    {}.hasOwnProperty.call(field, 'search_analyzer') === false;

  return runParametersDeserializers(field);
};
