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

export const serviceAccountIdSchema = z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH);

/**
 * Also used to validate the name UIAM reports back, where a rejection is logged rather than
 * thrown — see `UiamServiceAccounts`.
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
