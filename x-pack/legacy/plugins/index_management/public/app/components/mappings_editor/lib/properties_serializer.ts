/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { ALL_DATA_TYPES, PARAMETERS_DEFINITION } from '../constants';
import { FieldMeta } from '../types';
import { getFieldMeta } from '../lib';

const ALLOWED_FIELD_PROPERTIES = [
  ...Object.keys(PARAMETERS_DEFINITION),
  'type',
  'properties',
  'fields',
];

interface MappingsSerializerResponse {
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

const validateParameter = (parameter: string, value: any): boolean => {
  if (parameter === 'type') {
    return true;
  }

  if (parameter === 'name') {
    return false;
  }

  if (parameter === 'properties' || parameter === 'fields') {
    return isObject(value);
  }

  const parameterSchema = (PARAMETERS_DEFINITION as any)[parameter]!.schema;
  if (parameterSchema) {
    return Boolean(Joi.validate(value, parameterSchema).error) === false;
  }

  // Fallback, if no schema defined for the parameter (this should not happen in theory)
  return true;
};

const stripUnknownOrInvalidParameter = (field: GenericObject): GenericObject =>
  Object.entries(field)
    .filter(({ 0: key }) => ALLOWED_FIELD_PROPERTIES.includes(key))
    .reduce((acc, [key, value]) => {
      if (validateParameter(key, value)) {
        acc[key] = value;
      }
      return acc;
    }, {} as GenericObject);

const parseField = (field: any): { parsedField?: GenericObject; meta?: FieldMeta } => {
  // A field has to be an object
  if (!isObject(field)) {
    return {};
  }
  // With a known type
  if (!validateFieldType(field.type)) {
    return {};
  }

  // Filter out unknown or invalid "parameters"
  const parsedField = stripUnknownOrInvalidParameter(field);
  const meta = getFieldMeta(field);

  return { parsedField, meta };
};

const parseFields = (
  properties: GenericObject,
  path: string[] = []
): MappingsSerializerResponse => {
  return Object.entries(properties).reduce(
    (acc, [key, value]) => {
      const { parsedField, meta } = parseField(value);

      if (parsedField !== undefined) {
        if (meta!.hasChildFields) {
          // Recursively parse all the possible children ("properties" or "fields" for multi-fields)
          const parsedChildren = parseFields(parsedField[meta!.childFieldsName!], [...path, key]);
          parsedField[meta!.childFieldsName!] = parsedChildren.value;
          acc.propertiesRemoved = [...acc.propertiesRemoved, ...parsedChildren.propertiesRemoved];
        }

        acc.value[key] = parsedField;
      } else {
        acc.propertiesRemoved.push([...path, key].join('.'));
      }
      return acc;
    },
    {
      value: {},
      propertiesRemoved: [],
    } as MappingsSerializerResponse
  );
};

/**
 * Utility function that reads a mappings "properties" object and validate its fields by
 * - Removing unknown field types
 * - Removing unknown field parameters or field parameters that don't have the correct format.
 *
 * This method does not mutate the original properties object. It returns an object with
 * the parsed properties and an array of field paths that have been removed.
 * This allows us to display a warning in the UI and let the user correct the fields that we
 * are about to remove.
 *
 * @param properties A mappings "properties" object
 */
export const serializeProperties = (properties = {}): MappingsSerializerResponse => {
  if (!isObject(properties)) {
    return { value: {}, propertiesRemoved: [] };
  }

  const parsed = parseFields(properties);

  return parsed;
};

const mappingsSchema = Joi.object().keys({
  dynamic: Joi.any().valid([true, false, 'strict']),
  date_detection: Joi.boolean().strict(),
  numeric_detection: Joi.boolean().strict(),
  dynamic_date_formats: Joi.array().items(Joi.string()),
  _source: Joi.object().keys({
    enabled: Joi.boolean().strict(),
    includes: Joi.array().items(Joi.string()),
    excludes: Joi.array().items(Joi.string()),
  }),
});

export const serializeMappings = (mappings: any = {}): MappingsSerializerResponse => {
  const { properties, ...configuration } = mappings;

  const { value: parsedConfiguration } = Joi.validate(configuration, mappingsSchema, {
    stripUnknown: true,
  });

  const { value: parsedProperties, propertiesRemoved } = serializeProperties(properties);

  return {
    value: {
      ...parsedConfiguration,
      properties: parsedProperties,
    },
    propertiesRemoved,
  };
};
