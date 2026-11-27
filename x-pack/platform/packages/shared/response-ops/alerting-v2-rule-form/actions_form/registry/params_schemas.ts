/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';

const nonBlank = () => z.string().refine((value) => value.trim() !== '');

export const EMAIL_PARAMS_SCHEMA = lazySchema(() =>
  z.strictObject({
    to: z.array(nonBlank()).min(1),
    cc: z.array(nonBlank()).optional(),
    bcc: z.array(nonBlank()).optional(),
    subject: nonBlank(),
    message: nonBlank(),
  })
);

export const SLACK2_PARAMS_SCHEMA = lazySchema(() =>
  z.strictObject({
    channel: nonBlank(),
    text: nonBlank(),
  })
);
