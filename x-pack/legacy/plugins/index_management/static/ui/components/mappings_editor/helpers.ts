/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DataType } from './config';

export const hasNestedProperties = (selectedDatatype: DataType) =>
  selectedDatatype === 'object' ||
  selectedDatatype === 'nested' ||
  selectedDatatype === 'text' ||
  selectedDatatype === 'keyword';

export const propertiesArrayToObject = (properties?: any[]): any =>
  properties
    ? properties.reduce((acc, property) => {
        const { name, ...rest } = property;
        acc[property.name] = rest;
        if (hasNestedProperties(rest.type)) {
          // Recursively convert Array to Object
          if (rest.properties) {
            rest.properties = propertiesArrayToObject(rest.properties);
          } else if (rest.fields) {
            rest.fields = propertiesArrayToObject(rest.fields);
          }
        }
        return acc;
      }, {})
    : properties;

export const propertiesObjectToArray = (
  properties: {
    [key: string]: Record<string, any>;
  } = {}
): any[] =>
  Object.entries(properties).map(([name, property]) => {
    if (hasNestedProperties(property.type)) {
      // Recursively convert Object to Array
      if (property.properties) {
        return {
          name,
          ...property,
          properties: propertiesObjectToArray(property.properties),
        };
      } else if (property.fields) {
        return {
          name,
          ...property,
          fields: propertiesObjectToArray(property.fields),
        };
      }
    }
    return { name, ...property };
  });
