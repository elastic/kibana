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
 * Models do not always honor the `{ response: ... }` wrapper or the bounds of the user's schema.
 * Resolution order:
 *  1. wrapped and valid: `{ response: <value> }` where the value validates against the schema;
 *  2. unwrapped and valid: the arguments themselves validate against the schema. Arguments that
 *     carry a non-null `response` key the schema does not declare are never taken as unwrapped
 *     content;
 *  3. wrapped but out of schema: a warning naming the failing paths is logged, so one out-of-bounds
 *     field does not discard the whole answer. The non-null `response` is returned as is, unless the
 *     schema declares a `response` property itself, then the whole arguments object is returned;
 *  4. anything else (not an object, `{}`, missing or null `response` with non-matching arguments)
 *     throws, so a step can never complete with empty content.
 */
export const extractStructuredContent = ({
  parsed,
  schema,
  responseMetadata,
  logger,
}: {
  parsed: unknown;
  schema: unknown;
  responseMetadata?: Record<string, unknown>;
  logger?: { warn: (message: string) => void };
}): unknown => {
  if (isPlainObject(parsed)) {
    const jsonSchema = schema as JSONSchema7;
    const validator = convertJsonSchemaToZod(jsonSchema);

    const wrapped = parsed[STRUCTURED_OUTPUT_WRAPPER_PROPERTY];
    const hasWrapped = wrapped !== undefined && wrapped !== null;
    const wrappedResult = hasWrapped ? validator.safeParse(wrapped) : undefined;
    if (wrappedResult?.success) {
      return wrapped;
    }

    const declaresResponseProperty = isPlainObject(jsonSchema?.properties)
      ? STRUCTURED_OUTPUT_WRAPPER_PROPERTY in jsonSchema.properties
      : false;
    const hasContent = Object.keys(parsed).some((key) => parsed[key] !== undefined);
    const mayBeUnwrapped =
      parsed[STRUCTURED_OUTPUT_WRAPPER_PROPERTY] === undefined || declaresResponseProperty;
    if (hasContent && mayBeUnwrapped && validator.safeParse(parsed).success) {
      return parsed;
    }

    if (hasWrapped) {
      const failingPaths = (
        wrappedResult && !wrappedResult.success ? wrappedResult.error.issues : []
      ).map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
      logger?.warn(
        `The model response does not match the step "schema"; returning it as is. ` +
          `Failing paths: ${failingPaths.join('; ')}`
      );
      // A schema that declares `response` itself means the arguments are the answer, not a wrapper.
      return declaresResponseProperty ? parsed : wrapped;
    }
  }

  throw new ExecutionError({
    type: 'InvalidModelResponse',
    message:
      `The model response does not match the expected structured output. Expected an object ` +
      `with a non-null "${STRUCTURED_OUTPUT_WRAPPER_PROPERTY}" property, or a value that directly ` +
      `matches the step "schema".`,
    details: {
      receivedType: parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed,
      receivedKeys: isPlainObject(parsed) ? Object.keys(parsed) : [],
      metadata: responseMetadata,
    },
  });
};
