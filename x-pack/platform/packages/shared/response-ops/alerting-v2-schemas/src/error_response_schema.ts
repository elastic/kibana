/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';

/**
 * Standard error response shape returned by every alerting v2 route handler.
 *
 * - `code`    — A stable, machine-readable identifier (e.g. `RULE_NOT_FOUND`, `INVALID_SCHEDULE`).
 *               Changing this value is a breaking change.
 * - `error`   — A short category label (e.g. `Not Found`, `Bad Request`). For
 *               display and logs.
 * - `message` — A human-friendly explanation. Can be
 *               rephrased, localized, or have typos fixed without breaking
 *               clients. Do not parse this field in client code.
 * - `details` — An optional structured context whose keys depend on `code`.
 *               Identifier keys (`rule_id`, `action_policy_id`, `group_hash`, …)
 *               are stable, permanent public identifiers. On a request-validation
 *               400, `details.source` (`params` | `query` | `body`) names the part
 *               that failed and is the only guaranteed key; the sibling
 *               `details.errors` is a validation-library-generated tree whose
 *               internal shape is NOT part of the contract and can change on a
 *               dependency upgrade — do not branch on it.
 */
export const errorResponseSchema = lazySchema(() =>
  z
    .object({
      code: z
        .string()
        .describe(
          'Stable error code you can branch on, for example `INVALID_SCHEDULE` or `RULE_ALREADY_EXISTS`.'
        ),
      error: z
        .string()
        .describe(
          'A short human-readable summary of the error category (e.g., "Not Found", "Bad Request"). Subject to change without notice. Do not parse or rely on its content.'
        ),
      message: z
        .string()
        .describe(
          'A readable explanation of the error. The wording can change without notice. Do not parse this field.'
        ),
      details: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Optional structured context whose keys depend on `code`. Identifier keys such as `rule_id`, `action_policy_id` and `group_hash` are stable, permanent public identifiers. On a 400 request-validation error, `details.source` (`params`, `query`, or `body`) names the failing part and is the only guaranteed key. The sibling `details.errors` may change. Do not branch on it.'
        ),
    })
    .meta({ id: 'alerting_error_response' })
);

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
