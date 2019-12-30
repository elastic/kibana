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

const DEFAULT_FIELD_TYPE = 'object';

export type MappingsValidationError =
  | { code: 'ERR_CONFIG'; configName: string }
  | { code: 'ERR_FIELD'; fieldPath: string }
  | { code: 'ERR_PARAMETER'; paramName: string; fieldPath: string };

export interface MappingsValidatorResponse {
  /* The parsed mappings object without any error */
  value: GenericObject;
  errors?: MappingsValidationError[];
}

interface PropertiesValidatorResponse {
  /* The parsed "properties" object without any error */
  value: GenericObject;
  errors: MappingsValidationError[];
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
  // Sanitize the input to make sure we are working with an object
  if (!isObject(field)) {
    return { parametersRemoved: [] };
  }
  // Make sure the field "type" is valid
  if (!validateFieldType(field.type ?? DEFAULT_FIELD_TYPE)) {
    return { parametersRemoved: [] };
  }

  // Filter out unknown or invalid "parameters"
  const fieldWithType = { type: DEFAULT_FIELD_TYPE, ...field };
  const parsedField = stripUnknownOrInvalidParameter(fieldWithType);
  const meta = getFieldMeta(fieldWithType);

  return { ...parsedField, meta };
};

const parseFields = (
  properties: GenericObject,
  path: string[] = []
): PropertiesValidatorResponse => {
  return Object.entries(properties).reduce(
    (acc, [fieldName, unparsedField]) => {
      const fieldPath = [...path, fieldName].join('.');
      const { value: parsedField, parametersRemoved, meta } = parseField(unparsedField);

      if (parsedField === undefined) {
        // Field has been stripped out because it was invalid
        acc.errors.push({ code: 'ERR_FIELD', fieldPath });
      } else {
        if (meta!.hasChildFields || meta!.hasMultiFields) {
          // Recursively parse all the possible children ("properties" or "fields" for multi-fields)
          const parsedChildren = parseFields(parsedField[meta!.childFieldsName!], [
            ...path,
            fieldName,
          ]);
          parsedField[meta!.childFieldsName!] = parsedChildren.value;

          /**
           * If the children parsed have any error we concatenate them in our accumulator.
           */
          if (parsedChildren.errors) {
            acc.errors = [...acc.errors, ...parsedChildren.errors];
          }
        }

        acc.value[fieldName] = parsedField;

        if (Boolean(parametersRemoved.length)) {
          acc.errors = [
            ...acc.errors,
            ...parametersRemoved.map(paramName => ({
              code: 'ERR_PARAMETER' as 'ERR_PARAMETER',
              fieldPath,
              paramName,
            })),
          ];
        }
      }

      return acc;
    },
    {
      value: {},
      errors: [],
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
 * NOTE: The Joi Schema that we defined for each parameter (in "parameters_definition".tsx)
 * does not do an exhaustive validation of the parameter value.
 * It's main purpose is to prevent the UI from blowing up.
 *
 * @param properties A mappings "properties" object
 */
export const validateProperties = (properties = {}): PropertiesValidatorResponse => {
  // Sanitize the input to make sure we are working with an object
  if (!isObject(properties)) {
    return { value: {}, errors: [] };
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
): { value: any; errors: MappingsValidationError[] } => {
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

  const errors: MappingsValidationError[] = configurationRemoved.map(configName => ({
    code: 'ERR_CONFIG',
    configName,
  }));

  return { value: parsedConfiguration, errors };
};

export const validateMappings = (mappings: any = {}): MappingsValidatorResponse => {
  if (!isObject(mappings)) {
    return { value: {} };
  }

  const { properties, ...mappingsConfiguration } = mappings;

  const { value: parsedConfiguration, errors: configurationErrors } = validateMappingsConfiguration(
    mappingsConfiguration
  );
  const { value: parsedProperties, errors: propertiesErrors } = validateProperties(properties);

  const errors = [...configurationErrors, ...propertiesErrors];

  return {
    value: {
      ...parsedConfiguration,
      properties: parsedProperties,
    },
    errors: errors.length ? errors : undefined,
  };
};
