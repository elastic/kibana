/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_NODE_ID_LENGTH } from './constants';

export const nodeIdSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(MAX_NODE_ID_LENGTH)
    .regex(/^[A-Za-z0-9_-]+$/)
);
