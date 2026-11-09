/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Validator } from '@cfworker/json-schema';
import type { ApiTarget } from '@kbn/agent-builder-common';
import { loadSchemaClosure } from './schema_closure';
import { isRecord } from './types';

export interface ParamsValidationError {
  path: string;
  message: string;
}

export type ParamsValidator = (params: Record<string, unknown>) => ParamsValidationError[];

const buildValidator = async (
  target: ApiTarget,
  schema: Record<string, unknown>
): Promise<Validator> => {
  const validator = new Validator(schema, '2020-12', false);
  const closure = await loadSchemaClosure(target, schema);

  for (const [ref, sharedSchema] of closure) {
    validator.addSchema(sharedSchema, ref);
  }

  return validator;
};

const validatorCache: Record<ApiTarget, Map<object, Promise<Validator>>> = {
  elasticsearch: new Map(),
  kibana: new Map(),
};

/**
 * Builds the params validator for an API, memoized per `input` schema so the shared
 * referenced files are only loaded once per API.
 *
 * @param target - Backend the API belongs to.
 * @param schema - The API's `input` JSON Schema.
 * @returns A validator returning one error per problem found, empty when the params are valid.
 * @throws {Error} when the schema, or a schema it references, cannot be loaded.
 */
export const getValidator = async (
  target: ApiTarget,
  schema: Record<string, unknown>
): Promise<ParamsValidator> => {
  const cache = validatorCache[target];

  let pending = cache.get(schema);
  if (!pending) {
    pending = buildValidator(target, schema).catch((error) => {
      cache.delete(schema);
      throw error;
    });
    cache.set(schema, pending);
  }

  const validator = await pending;
  const knownParams = new Set(Object.keys(isRecord(schema.properties) ? schema.properties : {}));

  return (params) => {
    // `buildRequest` forwards unrecognized keys to the querystring, so an unknown top-level param
    // has to be caught here or it reaches the API in the wrong place.
    const errors: ParamsValidationError[] = Object.keys(params)
      .filter((key) => !knownParams.has(key))
      .map((key) => ({
        path: `#/${key}`,
        message: `Unknown parameter "${key}". It is not accepted by this API.`,
      }));

    const { valid, errors: schemaErrors } = validator.validate(params);
    if (!valid) {
      errors.push(
        ...schemaErrors.map(({ instanceLocation, error }) => ({
          path: instanceLocation,
          message: error,
        }))
      );
    }

    return errors;
  };
};
