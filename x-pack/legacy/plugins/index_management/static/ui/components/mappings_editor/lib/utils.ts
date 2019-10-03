/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DataType,
  Properties,
  Property,
  NormalizedProperties,
  NormalizedProperty,
  PropertyMeta,
  MainType,
  SubType,
  ChildPropertyName,
} from '../types';
import { DATA_TYPE_DEFINITION } from '../constants';

const getChildPropertiesName = (dataType: DataType): ChildPropertyName | undefined => {
  if (dataType === 'text' || dataType === 'keyword') {
    return 'fields';
  } else if (dataType === 'object' || dataType === 'nested') {
    return 'properties';
  }
  return undefined;
};

export const getPropertyMeta = (
  property: Property,
  path: string,
  parentPath?: string
): PropertyMeta => {
  const childPropertiesName = getChildPropertiesName(property.type);
  const canHaveChildProperties = Boolean(childPropertiesName);
  const hasChildProperties =
    childPropertiesName !== undefined &&
    Boolean(property[childPropertiesName]) &&
    Object.keys(property[childPropertiesName]!).length > 0;

  const childProperties = hasChildProperties
    ? Object.keys(property[childPropertiesName!]!).map(propertyName => `${path}.${propertyName}`)
    : undefined;

  return {
    path,
    parentPath,
    hasChildProperties,
    childPropertiesName,
    canHaveChildProperties,
    childProperties,
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

export const normalize = (propertiesToNormalize: Properties): NormalizedProperties => {
  const normalizeProperties = (
    props: Properties,
    to: NormalizedProperties['byId'] = {},
    paths: string[] = []
  ): Record<string, any> =>
    Object.entries(props).reduce((acc, [propName, value]) => {
      const parentPath = paths.length ? paths.join('.') : undefined;
      const propertyPathArray = [...paths, propName];
      const propertyPath = propertyPathArray.join('.');
      const property = { name: propName, ...value } as Property;
      const meta = getPropertyMeta(property, propertyPath, parentPath);

      const normalizedProperty: NormalizedProperty = {
        resource: property,
        ...meta,
      };

      acc[propertyPath] = normalizedProperty;

      if (meta.hasChildProperties) {
        return normalizeProperties(property[meta.childPropertiesName!]!, to, propertyPathArray);
      }

      acc[propertyPath] = normalizedProperty;
      return acc;
    }, to);

  const byId = normalizeProperties(propertiesToNormalize);

  return {
    byId,
    rootLevelFields: Object.keys(propertiesToNormalize),
  };
};
