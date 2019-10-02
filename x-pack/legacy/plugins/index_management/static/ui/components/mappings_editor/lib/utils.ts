/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataType, Property, MainType, SubType } from '../types';
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
