/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DataType, Field, FieldMeta, ChildFieldName } from '../types';

const getChildFieldsName = (dataType: DataType): ChildFieldName | undefined => {
  if (dataType === 'text' || dataType === 'keyword') {
    return 'fields';
  } else if (dataType === 'object' || dataType === 'nested') {
    return 'properties';
  }
  return undefined;
};

export const getFieldMeta = (field: Field, isMultiField?: boolean): FieldMeta => {
  const childFieldsName = getChildFieldsName(field.type);

  const canHaveChildFields = isMultiField ? false : childFieldsName === 'properties';
  const hasChildFields = isMultiField
    ? false
    : canHaveChildFields &&
      Boolean(field[childFieldsName!]) &&
      Object.keys(field[childFieldsName!]!).length > 0;

  const canHaveMultiFields = isMultiField ? false : childFieldsName === 'fields';
  const hasMultiFields = isMultiField
    ? false
    : canHaveMultiFields &&
      Boolean(field[childFieldsName!]) &&
      Object.keys(field[childFieldsName!]!).length > 0;

  return {
    childFieldsName,
    canHaveChildFields,
    hasChildFields,
    canHaveMultiFields,
    hasMultiFields,
    isExpanded: false,
  };
};
