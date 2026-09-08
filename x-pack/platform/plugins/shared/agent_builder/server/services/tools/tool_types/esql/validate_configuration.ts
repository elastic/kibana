/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type {
  EsqlToolConfig,
  EsqlToolFieldTypes,
  EsqlToolParamValue,
} from '@kbn/agent-builder-common';
import { createBadRequestError } from '@kbn/agent-builder-common';
import { getESQLQueryVariables } from '@kbn/esql-utils';

const validateDefaultValueType = (
  type: EsqlToolFieldTypes,
  defaultValue: EsqlToolParamValue,
  paramName: string
): void => {
  switch (type) {
    case 'string':
      if (typeof defaultValue !== 'string') {
        throw createBadRequestError(
          `Parameter '${paramName}' has type '${type}' but defaultValue is not a string`
        );
      }
      break;
    case 'integer':
      if (typeof defaultValue !== 'number' || !Number.isInteger(defaultValue)) {
        throw createBadRequestError(
          `Parameter '${paramName}' has type '${type}' but defaultValue is not an integer`
        );
      }
      break;
    case 'float':
      if (typeof defaultValue !== 'number') {
        throw createBadRequestError(
          `Parameter '${paramName}' has type '${type}' but defaultValue is not a number`
        );
      }
      break;
    case 'boolean':
      if (typeof defaultValue !== 'boolean') {
        throw createBadRequestError(
          `Parameter '${paramName}' has type '${type}' but defaultValue is not a boolean`
        );
      }
      break;
    case 'date':
      if (typeof defaultValue !== 'string') {
        throw createBadRequestError(
          `Parameter '${paramName}' has type '${type}' but defaultValue is not a string`
        );
      }
      break;
    case 'array':
      if (!Array.isArray(defaultValue)) {
        throw createBadRequestError(
          `Parameter '${paramName}' has type '${type}' but defaultValue is not an array`
        );
      }
      // Validate array elements are strings or numbers
      if (!defaultValue.every((item) => typeof item === 'string' || typeof item === 'number')) {
        throw createBadRequestError(
          `Parameter '${paramName}' has type '${type}' but defaultValue contains invalid elements (must be strings or numbers)`
        );
      }
      break;
  }
};

export const validateConfig = async (configuration: EsqlToolConfig) => {
  // Ensure query is proper ES|QL syntax
  const validationResult = await validateQuery(configuration.query);

  if (validationResult.errors.length > 0) {
    const message = `Validation error: \n${validationResult.errors
      .map((error) => ('text' in error ? error.text : ''))
      .join('\n')}`;
    throw createBadRequestError(message);
  }

  // Check for parameter mismatches
  const queryParams = getESQLQueryVariables(configuration.query);
  const definedParams = Object.keys(configuration.params);

  const undefinedParams = queryParams.filter((param) => !definedParams.includes(param));
  if (undefinedParams.length > 0) {
    throw createBadRequestError(
      `Query uses undefined parameters: ${undefinedParams.join(', ')}\n` +
        `Available parameters: ${definedParams.join(', ') || 'none'}`
    );
  }

  const unusedParams = definedParams.filter((param) => !queryParams.includes(param));
  if (unusedParams.length > 0) {
    throw createBadRequestError(
      `Defined parameters not used in query: ${unusedParams.join(', ')}\n` +
        `Query parameters: ${queryParams.join(', ') || 'none'}`
    );
  }

  // Validate defaultValue type matches parameter type
  for (const [paramName, param] of Object.entries(configuration.params)) {
    if (param.defaultValue !== undefined) {
      validateDefaultValueType(param.type, param.defaultValue, paramName);
    }
  }
};
