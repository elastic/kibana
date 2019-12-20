/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { ALL_DATA_TYPES, PARAMETERS_DEFINITION } from '../constants';

interface PropertiesSerializerResponse {
  value: GenericObject;
  propertiesRemoved: string[];
}

interface GenericObject {
  [key: string]: any;
}

export const isObject = (obj: any) => obj != null && obj.constructor.name === 'Object';

const validateFieldType = (type: any): boolean => {
  if (typeof type !== 'string') {
    return false;
  }
  if (!ALL_DATA_TYPES.includes(type)) {
    return false;
  }
  return true;
};

const ALLOWED_FIELD_PROPERTIES = [
  ...Object.keys(PARAMETERS_DEFINITION),
  'type',
  'properties',
  'fields',
];

const stripUnknownAndInvalidParameter = (field: GenericObject): GenericObject =>
  Object.entries(field)
    .filter(({ 0: key }) => ALLOWED_FIELD_PROPERTIES.includes(key))
    .reduce((acc, [key, value]) => {
      if ((PARAMETERS_DEFINITION as any)[key] && (PARAMETERS_DEFINITION as any)[key].schema) {
        const schema = (PARAMETERS_DEFINITION as any)[key].schema;
        const { error } = Joi.validate(value, schema);
        if (!error) {
          acc[key] = value;
        }
      } else {
        // If not shema defined (this should not happen in theory) we allow it.
        acc[key] = value;
      }

      return acc;
    }, {} as GenericObject);

const parseField = (field: any): GenericObject | undefined => {
  if (!isObject(field)) {
    return;
  }
  // Make sure the type is defined and known.
  if (!validateFieldType(field.type)) {
    return;
  }

  const parsedField = stripUnknownAndInvalidParameter(field);

  // Filter out unknown parameters
  return parsedField;
};

const getChildPropertiesProp = (obj: any): 'properties' | 'fields' | void => {
  if ({}.hasOwnProperty.call(obj, 'properties')) {
    return 'properties';
  } else if ({}.hasOwnProperty.call(obj, 'fields')) {
    return 'properties';
  }
};

const parseFields = (
  properties: GenericObject,
  path: string[] = []
): PropertiesSerializerResponse => {
  return Object.entries(properties).reduce(
    (acc, [key, value]) => {
      const fieldParsed = parseField(value);

      if (fieldParsed !== undefined) {
        const childPropertyProp = getChildPropertiesProp(fieldParsed);

        if (childPropertyProp) {
          // Recursively parse all the possible children ("properties" or "fields" for multi-fields)
          const parsedChildren = parseFields(fieldParsed[childPropertyProp], [...path, key]);
          fieldParsed[childPropertyProp] = parsedChildren.value;
          acc.propertiesRemoved = [...acc.propertiesRemoved, ...parsedChildren.propertiesRemoved];
        }

        acc.value[key] = fieldParsed;
      } else {
        acc.propertiesRemoved.push([...path, key].join('.'));
      }
      return acc;
    },
    {
      value: {},
      propertiesRemoved: [],
    } as PropertiesSerializerResponse
  );
};

export const serializeProperties = (properties = {}): PropertiesSerializerResponse => {
  if (!isObject(properties)) {
    return { value: {}, propertiesRemoved: [] };
  }

  const parsed = parseFields(properties);

  return parsed;
};
