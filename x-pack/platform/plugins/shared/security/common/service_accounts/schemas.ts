/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod';

import {
  ES_SERVICE_ACCOUNT_NAME_MAX_LENGTH,
  ES_SERVICE_ACCOUNT_NAME_REGEX,
  SERVICE_ACCOUNT_DESCRIPTION_MAX_LENGTH,
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
  UIAM_SERVICE_ACCOUNT_NAME_MAX_LENGTH,
} from './constants';
import type { ServiceAccountRoleLimits } from './constants';

export const serviceAccountIdSchema = z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH);

/**
 * Validates the name a caller asks for on Elasticsearch, where the name is also part of the
 * account's id. Beyond the create parameters it is also what a refused create checks before naming
 * the account in its audit event, so a rejected name never reaches the log as received.
 */
export const esServiceAccountNameSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(ES_SERVICE_ACCOUNT_NAME_MAX_LENGTH)
    .regex(
      ES_SERVICE_ACCOUNT_NAME_REGEX,
      'must begin with a letter or digit and may contain only letters, digits, hyphens and underscores'
    )
);

const CONTROL_CHARACTER_REGEX = /\p{Cc}/u;

/**
 * Validates the name a caller asks for on UIAM. UIAM generates the account's id, so the name is free
 * text: up to 100 UTF-16 code units, and not blank.
 *
 * Kibana is stricter than UIAM in two ways. It refuses control characters, because the name is
 * written to logs and audit events. And it trims the name, so two names that differ only by
 * surrounding whitespace cannot both pass UIAM's uniqueness check. The cap applies before the trim,
 * like the description's.
 */
export const uiamServiceAccountNameSchema = lazySchema(() =>
  z
    .string()
    // `.max()` counts code points. UIAM counts UTF-16 code units, and so do the UI and the body cap.
    .refine((name) => name.length <= UIAM_SERVICE_ACCOUNT_NAME_MAX_LENGTH, {
      message: `Too big: expected string to have <=${UIAM_SERVICE_ACCOUNT_NAME_MAX_LENGTH} characters`,
      abort: true,
    })
    .refine((name) => !CONTROL_CHARACTER_REGEX.test(name), {
      message: 'must not contain control characters',
    })
    .trim()
    .min(1, 'must not be blank')
);

/** The name rule of one backend. */
export type ServiceAccountNameSchema =
  | typeof esServiceAccountNameSchema
  | typeof uiamServiceAccountNameSchema;

/**
 * The cap applies to the raw input, before the trim, so the body limit on the route covers every
 * valid description. A blank description becomes `undefined`. UIAM refuses an empty string and
 * Elasticsearch accepts one, so Kibana never sends one to either backend.
 */
export const serviceAccountDescriptionSchema = z
  .string()
  .max(SERVICE_ACCOUNT_DESCRIPTION_MAX_LENGTH, { abort: true })
  // `.max()` counts code points; the route body cap and the UI `maxLength` assume UTF-16 code units.
  .refine((description) => description.length <= SERVICE_ACCOUNT_DESCRIPTION_MAX_LENGTH, {
    message: `Too big: expected string to have <=${SERVICE_ACCOUNT_DESCRIPTION_MAX_LENGTH} characters`,
  })
  .trim()
  .transform((description) => (description === '' ? undefined : description));

/**
 * The role list an account is created with, held to one backend's `limits`. What Kibana reads
 * back from a backend is bounded by that backend's own limits too, but validated separately,
 * since accounts can be written there without Kibana.
 *
 * Duplicate roles are dropped first, keeping first occurrences in order, so that the limit counts
 * distinct roles on every entry point. Both backends count duplicates against their own cap before
 * dropping them, so without this a list within the limit could still be refused.
 */
export const getServiceAccountRolesSchema = ({
  maxRoles,
  maxRoleNameLength,
}: ServiceAccountRoleLimits) =>
  z.preprocess(
    // Only touches what is already an array: anything else is left for the schema to describe.
    (roles) => (Array.isArray(roles) ? Array.from(new Set(roles)) : roles),
    z.array(z.string().min(1).max(maxRoleNameLength)).min(1).max(maxRoles)
  );

/**
 * Parameters for creating a service account, with roles held to `limits` and the name to
 * `nameSchema`. Validated in two places: the route body, and again inside the backend, since
 * callers of the server contract never pass through the route. Both use the backend's own rules.
 *
 * `roles` is required and non-empty. There is no "derive them from the creator" default: see
 * `CreateServiceAccountParams` in `@kbn/core-security-common`.
 */
export const getCreateServiceAccountParamsSchema = (
  limits: ServiceAccountRoleLimits,
  nameSchema: ServiceAccountNameSchema
) =>
  z.object({
    name: nameSchema,
    description: serviceAccountDescriptionSchema.optional(),
    roles: getServiceAccountRolesSchema(limits),
  });
