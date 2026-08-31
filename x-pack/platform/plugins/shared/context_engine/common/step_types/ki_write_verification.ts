/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_KI_ATTRIBUTE_KEY_LENGTH } from './ki';
import { DEFAULT_ESQL_ATTRIBUTE, MAX_ESQL_ATTRIBUTES, MAX_VERIFIER_IDS } from './verify_ki_step';

export const kiWriteVerificationSchema = z.object({
  esql_attributes: z
    .array(z.string().min(1).max(MAX_KI_ATTRIBUTE_KEY_LENGTH))
    .max(MAX_ESQL_ATTRIBUTES)
    .optional()
    .describe(
      `Names of the KI attributes carrying ES|QL to verify, defaulting to '${DEFAULT_ESQL_ATTRIBUTE}'. A listed attribute the KI does not carry is skipped, not failed.`
    ),
  verifiers: z
    .array(z.string().min(1).max(100))
    .min(1)
    .max(MAX_VERIFIER_IDS)
    .describe(
      'Verifier ids to run before writing the KI. At least one id is required; the step fails if none are listed or if an unknown id is specified.'
    ),
});

export type KiWriteVerification = z.infer<typeof kiWriteVerificationSchema>;
