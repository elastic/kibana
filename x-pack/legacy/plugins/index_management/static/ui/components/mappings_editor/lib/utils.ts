/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataType, Properties, Property, MainType, SubType } from '../types';
import { DATA_TYPE_DEFINITION } from '../constants';

export const hasNestedProperties = (dataType: DataType) =>
  dataType === 'object' || dataType === 'nested' || dataType === 'text' || dataType === 'keyword';

const getChildPropertiesAttributeName = (dataType: DataType) => {
  if (dataType === 'text' || dataType === 'keyword') {
    return 'fields';
  } else if (dataType === 'object' || dataType === 'nested') {
    return 'properties';
  }
  return undefined;
};

interface PropertyMeta {
  childPropertiesName: 'fields' | 'properties' | undefined;
  canHaveChildProperties: boolean;
  hasChildProperties: boolean;
  childProperties: Record<string, Property> | undefined;
}

export const getPropertyMeta = (property: Property): PropertyMeta => {
  const childPropertiesName = getChildPropertiesAttributeName(property.type);
  const canHaveChildProperties = Boolean(childPropertiesName);
  const hasChildProperties =
    childPropertiesName !== undefined &&
    Boolean(property[childPropertiesName]) &&
    Object.keys(property[childPropertiesName]!).length > 0;

  const childProperties = canHaveChildProperties ? property[childPropertiesName!] : undefined;
  return {
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

const isObject = (value: any): boolean =>
  value !== null && !Array.isArray(value) && typeof value === 'object';

export interface NormalizedProperties {
  byId: { [id: string]: Property };
  rootLevelFields: string[];
}

export const normalize = (propertiesToNormalize: Properties): NormalizedProperties => {
  const normalizeObject = (
    props: Properties = propertiesToNormalize,
    to: { [id: string]: Property } = {},
    paths: string[] = []
  ): Record<string, any> =>
    Object.entries(props).reduce((acc, [propName, value]) => {
      const updatedPaths = [...paths, propName];
      const propertyPath = updatedPaths.join('.');
      const property = { name: propName, ...value } as any;

      const { properties, fields, ...rest } = property;

      if (isObject(property.properties)) {
        acc[updatedPaths.join('.')] = {
          ...rest,
          __childProperties__: Object.keys(properties).map(key => `${propertyPath}.${key}`),
        };
        return normalizeObject(properties, to, updatedPaths);
      } else if (isObject(property.fields)) {
        acc[updatedPaths.join('.')] = {
          ...rest,
          __childProperties__: Object.keys(fields).map(key => `${propertyPath}.${key}`),
        };
        return normalizeObject(fields, to, updatedPaths);
      }

      acc[updatedPaths.join('.')] = property;
      return acc;
    }, to);

  const byId = normalizeObject();

  return {
    byId,
    rootLevelFields: Object.keys(propertiesToNormalize),
  };
};
