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

interface MappingsValidatorResponse {
  /* The parsed mappings object without any error */
  value: GenericObject;
  error?: {
    /* Keep track of the configuration parameter that will be stripped out */
    configurationRemoved: string[];
    /* Keep track of the fields that will be stripped out */
    propertiesRemoved: string[];
    /* Keep track of the field parameters that will be stripped out */
    parametersRemoved: { [key: string]: string[] };
  };
}

interface PropertiesValidatorResponse {
  /* The parsed "properties" object without any error */
  value: GenericObject;
  error?: {
    propertiesRemoved: string[];
    parametersRemoved: { [key: string]: string[] };
  };
}

interface FieldValidatorResponse {
  /* The parsed field. If undefined means that it was invalid */
  value?: GenericObject;
  parametersRemoved: string[];
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

const stripUnknownOrInvalidParameter = (field: GenericObject): FieldValidatorResponse =>
  Object.entries(field).reduce(
    (acc, [key, value]) => {
      if (!ALLOWED_FIELD_PROPERTIES.includes(key) || !validateParameter(key, value)) {
        acc.parametersRemoved.push(key);
      } else {
        acc.value = acc.value ?? {};
        acc.value[key] = value;
      }
      return acc;
    },
    { parametersRemoved: [] } as FieldValidatorResponse
  );

const parseField = (field: any): FieldValidatorResponse & { meta?: FieldMeta } => {
  // A field has to be an object
  if (!isObject(field)) {
    return { parametersRemoved: [] };
  }
  // With a known type
  if (!validateFieldType(field.type)) {
    return { parametersRemoved: [] };
  }

  // Filter out unknown or invalid "parameters"
  const parsedField = stripUnknownOrInvalidParameter(field);
  const meta = getFieldMeta(field);

  return { ...parsedField, meta };
};

const parseFields = (
  properties: GenericObject,
  path: string[] = []
): PropertiesValidatorResponse => {
  return Object.entries(properties).reduce(
    (acc, [key, value]) => {
      const fieldPath = [...path, key].join('.');
      const { value: parsedField, parametersRemoved, meta } = parseField(value);

      if (parsedField === undefined) {
        // Field has been stripped out because it was invalid
        acc.error = acc.error ?? { propertiesRemoved: [], parametersRemoved: {} };
        acc.error.propertiesRemoved.push(fieldPath);
      } else {
        if (meta!.hasChildFields || meta!.hasMultiFields) {
          // Recursively parse all the possible children ("properties" or "fields" for multi-fields)
          const parsedChildren = parseFields(parsedField[meta!.childFieldsName!], [...path, key]);
          parsedField[meta!.childFieldsName!] = parsedChildren.value;

          /**
           * If the children parsed have any error we concatenate them in our accumulator.
           */
          if (parsedChildren.error) {
            acc.error = acc.error ?? { propertiesRemoved: [], parametersRemoved: {} };

            acc.error.propertiesRemoved = [
              ...acc.error!.propertiesRemoved,
              ...parsedChildren.error!.propertiesRemoved,
            ];
            acc.error.parametersRemoved = {
              ...acc.error.parametersRemoved,
              ...parsedChildren.error!.parametersRemoved,
            };
          }
        }

        acc.value[key] = parsedField;

        if (Boolean(parametersRemoved.length)) {
          acc.error = acc.error ?? { propertiesRemoved: [], parametersRemoved: {} };
          acc.error.parametersRemoved[fieldPath] = parametersRemoved;
        }
      }

      return acc;
    },
    {
      value: {},
    } as PropertiesValidatorResponse
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
export const validateProperties = (properties = {}): PropertiesValidatorResponse => {
  if (!isObject(properties)) {
    return { value: {} };
  }

  return parseFields(properties);
};

/**
 * Single source of truth to validate the *configuration* of the mappings.
 * Whenever a user loads a JSON object it will be validate against this Joi schema.
 */
export const mappingsConfigurationSchema = Joi.object().keys({
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

const validateMappingsConfiguration = (
  mappingsConfiguration: any
): { value: any; configurationRemoved: string[] } => {
  // Array to keep track of invalid configuration parameters.
  const configurationRemoved: string[] = [];

  const { value: parsedConfiguration, error: configurationError } = Joi.validate(
    mappingsConfiguration,
    mappingsConfigurationSchema,
    {
      stripUnknown: true,
      abortEarly: false,
    }
  );

  if (configurationError) {
    /**
     * To keep the logic simple we will strip out the parameters that contain errors
     */
    configurationError.details.forEach(error => {
      const configurationName = error.path[0];
      configurationRemoved.push(configurationName);
      delete parsedConfiguration[configurationName];
    });
  }

  return { value: parsedConfiguration, configurationRemoved };
};

export const validateMappings = (mappings: any = {}): MappingsValidatorResponse => {
  if (!isObject(mappings)) {
    return { value: {} };
  }

  const { properties, ...mappingsConfiguration } = mappings;

  const { value: parsedConfiguration, configurationRemoved } = validateMappingsConfiguration(
    mappingsConfiguration
  );
  const { value: parsedProperties, error: propertiesError } = validateProperties(properties);

  let error: MappingsValidatorResponse['error'];

  if (propertiesError !== undefined || Boolean(configurationRemoved.length)) {
    // Build our error response
    error = {
      propertiesRemoved: [],
      parametersRemoved: {},
      configurationRemoved,
      ...propertiesError,
    };
  }

  return {
    value: {
      ...parsedConfiguration,
      properties: parsedProperties,
    },
    error,
  };
};
