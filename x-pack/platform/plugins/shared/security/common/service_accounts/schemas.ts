/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import {
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
  SERVICE_ACCOUNT_NAME_MAX_LENGTH,
  SERVICE_ACCOUNT_NAME_REGEX,
} from './constants';
import type { ServiceAccountRoleLimits } from './constants';

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
 * Parameters for creating a service account, with roles held to `limits`. Validated in two
 * places: the route body, and again inside the backend, since callers of the server contract never
 * pass through the route. Both use the backend's own limits.
 *
 * `roles` is required and non-empty. There is no "derive them from the creator" default: see
 * `CreateServiceAccountParams` in `@kbn/core-security-common`.
 */
export const getCreateServiceAccountParamsSchema = (limits: ServiceAccountRoleLimits) =>
  z.object({
    name: serviceAccountNameSchema,
    roles: getServiceAccountRolesSchema(limits),
  });
