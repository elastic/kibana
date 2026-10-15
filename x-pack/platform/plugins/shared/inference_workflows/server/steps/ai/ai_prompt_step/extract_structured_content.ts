/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JSONSchema7 } from 'json-schema';
import { ExecutionError } from '@kbn/workflows/server';
import { convertJsonSchemaToZod } from '@kbn/workflows/spec/lib/build_fields_zod_validator';

export const STRUCTURED_OUTPUT_WRAPPER_PROPERTY = 'response';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Builds the tool schema sent to the model: the user's schema nested under a required `response`
 * property. The wrapper exists because structured output needs an object at the root, while the
 * user's schema may be an array or a primitive.
 */
export const wrapStructuredOutputSchema = (schema: unknown) => ({
  type: 'object',
  properties: {
    [STRUCTURED_OUTPUT_WRAPPER_PROPERTY]: schema,
  },
  required: [STRUCTURED_OUTPUT_WRAPPER_PROPERTY],
});

/**
 * Reads the step content out of the tool-call arguments returned by the model.
 *
 * Models do not always honor the `{ response: ... }` wrapper; some return the inner object at the
 * top level. Accepted, in order:
 *  1. wrapped: `{ response: <value> }` where the value validates against the user's schema;
 *  2. unwrapped: the arguments themselves validate against the user's schema;
 * Anything else throws, so a step can never complete with empty content.
 */
export const extractStructuredContent = ({
  parsed,
  schema,
  responseMetadata,
}: {
  parsed: unknown;
  schema: unknown;
  responseMetadata?: Record<string, unknown>;
}): unknown => {
  if (isPlainObject(parsed)) {
    const innerValidator = convertJsonSchemaToZod(schema as JSONSchema7);
    const conforms = (value: unknown) => innerValidator.safeParse(value).success;

    const wrapped = parsed[STRUCTURED_OUTPUT_WRAPPER_PROPERTY];
    if (wrapped !== undefined && conforms(wrapped)) {
      return wrapped;
    }

    // `{ response: <invalid> }` is a wrapped answer that failed validation, not an unwrapped object
    // that happens to be shaped like the wrapper, unless the user's schema declares `response` itself.
    const declaresResponseProperty = isPlainObject((schema as JSONSchema7)?.properties)
      ? STRUCTURED_OUTPUT_WRAPPER_PROPERTY in (schema as JSONSchema7).properties!
      : false;
    const keys = Object.keys(parsed).filter((key) => parsed[key] !== undefined);
    const onlyWrapperKey = keys.length === 1 && keys[0] === STRUCTURED_OUTPUT_WRAPPER_PROPERTY;
    if (keys.length > 0 && !(onlyWrapperKey && !declaresResponseProperty) && conforms(parsed)) {
      return parsed;
    }
  }

  throw new ExecutionError({
    type: 'InvalidModelResponse',
    message:
      `The model response does not match the expected structured output. Expected an object ` +
      `with a "${STRUCTURED_OUTPUT_WRAPPER_PROPERTY}" property holding a value that matches the ` +
      `step "schema", or a value that directly matches the "schema".`,
    details: {
      receivedType: parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed,
      receivedKeys: isPlainObject(parsed) ? Object.keys(parsed) : [],
      metadata: responseMetadata,
    },
  });
};
