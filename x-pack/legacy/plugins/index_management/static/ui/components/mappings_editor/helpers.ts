/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { DataType } from './config';

export const hasNestedProperties = (selectedDatatype: DataType) =>
  selectedDatatype === 'object' ||
  selectedDatatype === 'nested' ||
  selectedDatatype === 'text' ||
  selectedDatatype === 'keyword';

const getNestedFieldsPropName = (selectedDatatype: DataType) => {
  if (selectedDatatype === 'text' || selectedDatatype === 'keyword') {
    return 'fields';
  } else if (selectedDatatype === 'object' || selectedDatatype === 'nested') {
    return 'properties';
  }
  return undefined;
};

export const getNestedFieldMeta = (
  property: Record<string, any>
): {
  hasChildProperties: boolean;
  allowChildProperty: boolean;
  nestedFieldPropName: 'fields' | 'properties' | undefined;
  childProperties: Record<string, any>;
} => {
  const nestedFieldPropName = getNestedFieldsPropName(property.type);
  const hasChildProperties =
    typeof nestedFieldPropName !== 'undefined' &&
    Boolean(property[nestedFieldPropName]) &&
    Object.keys(property[nestedFieldPropName]).length > 0;

  const allowChildProperty = Boolean(nestedFieldPropName);
  const childProperties = allowChildProperty && property[nestedFieldPropName!];
  return { hasChildProperties, nestedFieldPropName, allowChildProperty, childProperties };
};

export const getParentObject = (path: string, object = {}): Record<string, any> => {
  const pathToArray = path.split('.');
  if (pathToArray.length === 1) {
    return object;
  }
  const parentPath = pathToArray.slice(0, -1).join('.');
  return get(object, parentPath);
};

// We use an old version of lodash that does not have the _.unset() utility method.
// We implement our own here.
export const unset = (object: Record<string, any>, path: string): boolean => {
  const pathToArray = path.split('.');
  let hasBeenRemoved: boolean;

  if (pathToArray.length === 1) {
    const [prop] = pathToArray;
    hasBeenRemoved = {}.hasOwnProperty.call(object, prop);
    delete object[prop];
  } else {
    const parentObject = getParentObject(path, object);
    if (!parentObject || typeof parentObject !== 'object') {
      hasBeenRemoved = false;
    } else {
      const prop = pathToArray[pathToArray.length - 1];
      hasBeenRemoved = {}.hasOwnProperty.call(parentObject, prop);
      delete (parentObject as any)[prop];
    }
  }

  return hasBeenRemoved;
};
