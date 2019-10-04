/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DataType,
  Fields,
  Field,
  NormalizedFields,
  NormalizedField,
  FieldMeta,
  MainType,
  SubType,
  ChildFieldName,
} from '../types';
import { DATA_TYPE_DEFINITION } from '../constants';

const getChildFieldsName = (dataType: DataType): ChildFieldName | undefined => {
  if (dataType === 'text' || dataType === 'keyword') {
    return 'fields';
  } else if (dataType === 'object' || dataType === 'nested') {
    return 'properties';
  }
  return undefined;
};

export const getFieldMeta = (field: Field, path: string, parentPath?: string): FieldMeta => {
  const childFieldsName = getChildFieldsName(field.type);
  const canHaveChildFields = Boolean(childFieldsName);
  const hasChildFields =
    childFieldsName !== undefined &&
    Boolean(field[childFieldsName]) &&
    Object.keys(field[childFieldsName]!).length > 0;

  const childFields = hasChildFields
    ? Object.keys(field[childFieldsName!]!).map(propertyName => `${path}.${propertyName}`)
    : undefined;

  return {
    path,
    parentPath,
    hasChildFields,
    childFieldsName,
    canHaveChildFields,
    childFields,
  };
};

/**
 * Return a map of subType -> mainType
 *
 * @example
 *
 * {
 *   long: 'numeric',
 *   integer: 'numeric',
 *   short: 'numeric',
 * }
 */
const subTypesMapToType = Object.entries(DATA_TYPE_DEFINITION).reduce(
  (acc, [type, definition]) => {
    if ({}.hasOwnProperty.call(definition, 'subTypes')) {
      definition.subTypes!.types.forEach(subType => {
        acc[subType] = type;
      });
    }
    return acc;
  },
  {} as Record<SubType, string>
);

export const getTypeFromSubType = (subType: SubType): MainType =>
  subTypesMapToType[subType] as MainType;

/**
 * In order to better work with the recursive pattern of the mappings `properties`, this method flatten the fields
 * to a `byId` object where the key is the path to the field and the value is a `NormalizedField`.
 * The `NormalizedField` contains the field data under `source` and meta information about the capability of the field.
 *
 * @example

// original
{
  myObject: {
    type: 'object',
    properties: {
      name: {
        type: 'text'
      }
    }
  }
}

// normalized
{
  rootLevelFields: ['myObject'],
  byId: {
    myObject: {
      source: { type: 'object' },
      path: 'myObject',
      parentPath: undefined,
      hasChildFields: true,
      childFieldsName: 'properties', // "object" type have their child fields under "properties"
      canHaveChildFields: true,
      childFields: ['myObject.name'],
    },
    'myObject.name': {
      source: { type: 'text' },
      path: 'myObject.name',
      parentPath: 'myObject',
      hasChildFields: false,
      childFieldsName: 'fields', // "text" type have their child fields under "fields"
      canHaveChildFields: true,
      childFields: undefined,
    },
  },
}
 *
 * @param fieldsToNormalize The "properties" object from the mappings (or "fields" object for `text` and `keyword` types)
 */
export const normalize = (fieldsToNormalize: Fields): NormalizedFields => {
  const normalizeFields = (
    props: Fields,
    to: NormalizedFields['byId'] = {},
    paths: string[] = []
  ): Record<string, any> =>
    Object.entries(props).reduce((acc, [propName, value]) => {
      const parentPath = paths.length ? paths.join('.') : undefined;
      const propertyPathArray = [...paths, propName];
      const propertyPath = propertyPathArray.join('.');
      const field = { name: propName, ...value } as Field;
      const meta = getFieldMeta(field, propertyPath, parentPath);
      const { properties, fields, ...rest } = field;

      const normalizedField: NormalizedField = {
        source: rest,
        ...meta,
      };

      acc[propertyPath] = normalizedField;

      if (meta.hasChildFields) {
        return normalizeFields(field[meta.childFieldsName!]!, to, propertyPathArray);
      }

      acc[propertyPath] = normalizedField;
      return acc;
    }, to);

  const byId = normalizeFields(fieldsToNormalize);

  return {
    byId,
    rootLevelFields: Object.keys(fieldsToNormalize),
  };
};

export const deNormalize = (normalized: NormalizedFields): Fields => {
  const deNormalizePaths = (paths: string[], to: Fields = {}) => {
    paths.forEach(path => {
      const { source, childFields, childFieldsName } = normalized.byId[path];
      const { name, ...normalizedField } = source;
      const field: Omit<Field, 'name'> = normalizedField;
      to[name] = field;
      if (childFields) {
        field[childFieldsName!] = {};
        return deNormalizePaths(childFields, field[childFieldsName!]);
      }
    });
    return to;
  };

  return deNormalizePaths(normalized.rootLevelFields);
};
