/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { pick } from 'lodash';
import * as t from 'io-ts';
import { ordString } from 'fp-ts/lib/Ord';
import { toArray } from 'fp-ts/lib/Set';
import { isLeft } from 'fp-ts/lib/Either';

import { errorReporter } from './error_reporter';

type MappingsValidationError =
  | { code: 'ERR_CONFIG'; configName: string }
  | { code: 'ERR_FIELD'; fieldPath: string }
  | { code: 'ERR_PARAMETER'; paramName: string; fieldPath: string };

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
