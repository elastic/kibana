/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuildFlavor } from '@kbn/config/src/types';
import { z } from '@kbn/zod';

import type { ServiceAccountRoleLimits } from '../../../common/service_accounts';
import {
  getCreateServiceAccountParamsSchema,
  SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE,
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
  SERVICE_ACCOUNT_NAME_MAX_LENGTH,
  serviceAccountIdSchema,
} from '../../../common/service_accounts';
import {
  ES_SERVICE_ACCOUNT_ROLE_LIMITS,
  UIAM_SERVICE_ACCOUNT_ROLE_LIMITS,
} from '../../service_accounts';

/**
 * The role limits of the backend this build creates service accounts with. The build flavor fixes
 * the backend: serverless builds use UIAM and every other build uses Elasticsearch, the same
 * choice `ServiceAccountsService#start` makes.
 */
export const getServiceAccountRoleLimits = (buildFlavor: BuildFlavor): ServiceAccountRoleLimits =>
  buildFlavor === 'serverless' ? UIAM_SERVICE_ACCOUNT_ROLE_LIMITS : ES_SERVICE_ACCOUNT_ROLE_LIMITS;

/** Two quotes and a comma around each role. */
const ROLE_FRAMING_BYTES = 3;
/** The keys, braces and quotes around the name and the role list. */
const BODY_FRAMING_BYTES = 64;

/**
 * The largest create body a request within `limits` can produce, used as the route's body cap so
 * that such a request gets a 400 naming the field rather than a 413 with no field-level message.
 *
 * Each role name character is counted as two bytes. Elasticsearch accepts only printable ASCII in
 * role names, and the widest of those in JSON are `"` and `\`, which escape to two bytes. The name
 * is limited to ASCII letters, digits, hyphens and underscores, so one byte each.
 */
export const getCreateServiceAccountMaxBodyBytes = ({
  maxRoles,
  maxRoleNameLength,
}: ServiceAccountRoleLimits): number =>
  maxRoles * (2 * maxRoleNameLength + ROLE_FRAMING_BYTES) +
  SERVICE_ACCOUNT_NAME_MAX_LENGTH +
  BODY_FRAMING_BYTES;

export const getCreateServiceAccountBodySchema = (limits: ServiceAccountRoleLimits) =>
  getCreateServiceAccountParamsSchema(limits)
    // Rejects unknown keys, so callers cannot supply `assumable_by` or `role_assignments`. Kibana
    // derives both itself.
    .strict();

export const listServiceAccountsQuerySchema = z.object({
  // Defaulted rather than left optional, so the page size a caller gets is decided here and not
  // again in each backend.
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE)
    .default(SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE),
  after: z.string().min(1).max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH).optional(),
});

export const getServiceAccountParamsSchema = z.object({
  id: serviceAccountIdSchema.min(1),
});
