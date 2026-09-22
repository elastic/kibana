/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import {
  SERVICE_ACCOUNT_MAX_ROLES,
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
  SERVICE_ACCOUNT_NAME_MAX_LENGTH,
  SERVICE_ACCOUNT_NAME_REGEX,
} from './constants';

export const serviceAccountIdSchema = z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH);

/**
 * Also used to validate the name a backend reports back, so `UiamServiceAccounts` refuses a name
 * Kibana cannot round-trip instead of handing it to callers.
 */
export const serviceAccountNameSchema = z
  .string()
  .min(1)
  .max(SERVICE_ACCOUNT_NAME_MAX_LENGTH)
  .regex(
    SERVICE_ACCOUNT_NAME_REGEX,
    'must begin with a letter or digit and may contain only letters, digits, hyphens and underscores'
  );

export const serviceAccountRoleNameSchema = z
  .string()
  .min(1)
  .max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH);

/**
 * The role list an account is created with, whether the caller named it or Kibana derived it. One
 * schema for both, so that nothing Kibana writes falls outside what it is willing to read back.
 */
export const serviceAccountRolesSchema = z
  .array(serviceAccountRoleNameSchema)
  .min(1)
  .max(SERVICE_ACCOUNT_MAX_ROLES);

/**
 * Parameters for creating a service account. Validated in two places: the route body, and again
 * inside each backend, since callers of the server contract never pass through the route.
 *
 * An omitted `roles` asks Kibana to derive them. An empty `roles` asks for none, which is a
 * different question, so it is refused rather than guessed at.
 */
export const createServiceAccountParamsSchema = z.object({
  name: serviceAccountNameSchema,
  roles: serviceAccountRolesSchema.optional(),
});
