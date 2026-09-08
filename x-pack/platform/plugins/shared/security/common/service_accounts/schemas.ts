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
} from './constants';

export const serviceAccountIdSchema = z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH);
export const serviceAccountNameSchema = z.string().max(SERVICE_ACCOUNT_NAME_MAX_LENGTH);
