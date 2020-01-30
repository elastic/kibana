/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { pick, isPlainObject } from 'lodash';
import * as t from 'io-ts';
import { ordString } from 'fp-ts/lib/Ord';
import { toArray } from 'fp-ts/lib/Set';
import { isLeft, isRight } from 'fp-ts/lib/Either';

import { errorReporter } from './error_reporter';
import { ALL_DATA_TYPES, PARAMETERS_DEFINITION } from '../constants';
import { FieldMeta } from '../types';
import { getFieldMeta } from './utils';

const ALLOWED_FIELD_PROPERTIES = [
  ...Object.keys(PARAMETERS_DEFINITION),
  'type',
  'properties',
  'fields',
];

const DEFAULT_FIELD_TYPE = 'object';

type MappingsValidationError =
  | { code: 'ERR_CONFIG'; configName: string }
  | { code: 'ERR_FIELD'; fieldPath: string }
  | { code: 'ERR_PARAMETER'; paramName: string; fieldPath: string };

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
    return isPlainObject(value);
  }

  const parameterSchema = (PARAMETERS_DEFINITION as any)[parameter]!.schema;
  if (parameterSchema) {
    return isRight(parameterSchema.decode(value));
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
        acc.value = acc.value !== undefined && acc.value !== null ? acc.value : {};
        acc.value[key] = value;
      }
      return acc;
    },
    { parametersRemoved: [] } as FieldValidatorResponse
  );

const parseField = (field: any): FieldValidatorResponse & { meta?: FieldMeta } => {
  // Sanitize the input to make sure we are working with an object
  if (!isPlainObject(field)) {
    return { parametersRemoved: [] };
  }
  // Make sure the field "type" is valid
  if (
    !validateFieldType(
      field.type !== undefined && field.type !== null ? field.type : DEFAULT_FIELD_TYPE
    )
  ) {
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
 * Single source of truth to validate the *configuration* of the mappings.
 * Whenever a user loads a JSON object it will be validate against this Joi schema.
 */
const mappingsConfigurationSchema = t.exact(
  t.partial({
    dynamic: t.union([t.literal(true), t.literal(false), t.literal('strict')]),
    date_detection: t.boolean,
    numeric_detection: t.boolean,
    dynamic_date_formats: t.array(t.string),
    _source: t.exact(
      t.partial({
        enabled: t.boolean,
        includes: t.array(t.string),
        excludes: t.array(t.string),
      })
    ),
    _meta: t.UnknownRecord,
    _routing: t.interface({
      required: t.boolean,
    }),
  })
);

const mappingsConfigurationSchemaKeys = Object.keys(mappingsConfigurationSchema.type.props);
const sourceConfigurationSchemaKeys = Object.keys(
  mappingsConfigurationSchema.type.props._source.type.props
);

export const validateMappingsConfiguration = (
  mappingsConfiguration: any
): { value: any; errors: MappingsValidationError[] } => {
  // Set to keep track of invalid configuration parameters.
  const configurationRemoved: Set<string> = new Set();

  let copyOfMappingsConfig = { ...mappingsConfiguration };
  const result = mappingsConfigurationSchema.decode(mappingsConfiguration);
  const isSchemaInvalid = isLeft(result);

  const unknownConfigurationParameters = Object.keys(mappingsConfiguration).filter(
    key => mappingsConfigurationSchemaKeys.includes(key) === false
  );

  const unknownSourceConfigurationParameters =
    mappingsConfiguration._source !== undefined
      ? Object.keys(mappingsConfiguration._source).filter(
          key => sourceConfigurationSchemaKeys.includes(key) === false
        )
      : [];

  if (isSchemaInvalid) {
    /**
     * To keep the logic simple we will strip out the parameters that contain errors
     */
    const errors = errorReporter.report(result);
    errors.forEach(error => {
      const configurationName = error.path[0];
      configurationRemoved.add(configurationName);
      delete copyOfMappingsConfig[configurationName];
    });
  }

  if (unknownConfigurationParameters.length > 0) {
    unknownConfigurationParameters.forEach(configName => configurationRemoved.add(configName));
  }

  if (unknownSourceConfigurationParameters.length > 0) {
    configurationRemoved.add('_source');
    delete copyOfMappingsConfig._source;
  }

  copyOfMappingsConfig = pick(copyOfMappingsConfig, mappingsConfigurationSchemaKeys);

  const errors: MappingsValidationError[] = toArray<string>(ordString)(configurationRemoved)
    .map(configName => ({
      code: 'ERR_CONFIG',
      configName,
    }))
    .sort((a, b) => a.configName.localeCompare(b.configName)) as MappingsValidationError[];

  return { value: copyOfMappingsConfig, errors };
};

export const VALID_MAPPINGS_PARAMETERS = [
  ...mappingsConfigurationSchemaKeys,
  'dynamic_templates',
  'properties',
];
