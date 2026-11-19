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
  SECRET_PROVIDER_TYPE,
  SECRET_REFERENCE_MAX_LENGTH,
  SECRET_VALUE_MAX_LENGTH,
  SECRET_VALUE_MIN_LENGTH,
} from '@kbn/secrets';

const CONNECTOR_ID_MAX_LENGTH = 255;

const nameSchema = schema.string({ minLength: 1, maxLength: SECRET_NAME_MAX_LENGTH });

const sourceSchema = schema.oneOf([
  schema.object({
    provider: schema.literal(SECRET_PROVIDER_TYPE.kibana),
    value: schema.string({
      minLength: SECRET_VALUE_MIN_LENGTH,
      maxLength: SECRET_VALUE_MAX_LENGTH,
    }),
  }),
  schema.object({
    provider: schema.literal(SECRET_PROVIDER_TYPE.connector),
    connectorId: schema.string({ minLength: 1, maxLength: CONNECTOR_ID_MAX_LENGTH }),
    reference: schema.string({ minLength: 1, maxLength: SECRET_REFERENCE_MAX_LENGTH }),
  }),
]);

const descriptionSchema = schema.maybe(schema.string({ maxLength: SECRET_DESCRIPTION_MAX_LENGTH }));

export const secretNameParamsSchema = schema.object({ name: nameSchema });

export const createSecretBodySchema = schema.object({
  name: nameSchema,
  description: descriptionSchema,
  source: sourceSchema,
});

/** The name comes from the path: it cannot change. */
export const replaceSecretBodySchema = schema.object({
  description: descriptionSchema,
  source: sourceSchema,
});
