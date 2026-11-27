/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  SECRET_DESCRIPTION_MAX_LENGTH,
  SECRET_NAME_MAX_LENGTH,
  SECRET_VALUE_MAX_LENGTH,
} from '@kbn/secrets';

// The schemas only bound the input. The secrets client checks the rules, such as the name
// format and the minimum value length, and reports a broken one as `SecretValidationError`.
const nameSchema = schema.boundedString({ maxLength: SECRET_NAME_MAX_LENGTH });
const valueSchema = schema.boundedString({ maxLength: SECRET_VALUE_MAX_LENGTH });
const descriptionSchema = schema.maybe(
  schema.description({ maxLength: SECRET_DESCRIPTION_MAX_LENGTH })
);

/** The path parameters of a route that acts on one secret. */
export const secretNameParamsSchema = schema.object({ name: nameSchema });

/** The body of a route that creates a secret. */
export const createSecretBodySchema = schema.object({
  name: nameSchema,
  description: descriptionSchema,
  value: valueSchema,
});

/** The body of a route that updates a secret. The name comes from the path and never changes. */
export const updateSecretBodySchema = schema.object({
  description: descriptionSchema,
  value: schema.maybe(valueSchema),
});
